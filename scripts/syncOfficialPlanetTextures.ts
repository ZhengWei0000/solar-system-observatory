import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { z } from "zod";

import textureManifestJson from "../data/curated/official-planet-textures.json";
import { getPlanetAppearanceProfile } from "../lib/appearance/planet-appearance";
import type { PlanetTextureSourceType } from "../types";
import {
  ensureDir,
  fetchBinary,
  logStep,
  logWarning,
  pathExists,
  writeBinaryFile,
  writeJsonFile,
} from "./utils";

const execFile = promisify(execFileCallback);

const sourceKindSchema = z.enum(["planet", "ring"]);
const mapKeySchema = z.enum(["albedo", "ringColor", "ringAlpha"]);
const sourceTypeSchema = z.enum([
  "official_observational",
  "official_model_texture",
  "official_interpreted",
  "generated_fallback",
]);

const textureManifestSchema = z.array(
  z.object({
    bodyId: z.string(),
    sourceType: sourceTypeSchema,
    sourcePage: z.string().url(),
    download: z.object({
      kind: z.enum(["direct_raster", "glb_extract"]),
      url: z.string().url(),
      fileName: z.string(),
    }),
    outputs: z.array(
      z.object({
        mapKey: mapKeySchema,
        sourceKind: sourceKindSchema,
        nameIncludes: z.string().optional(),
        duplicateTo: z.array(mapKeySchema).optional(),
      }),
    ),
  }),
);

type TextureManifestEntry = z.infer<typeof textureManifestSchema>[number];
type Quality = "1k" | "2k" | "4k" | "8k";

type ExtractedGlbImage = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const regularSizes: Record<Quality, number> = {
  "1k": 1024,
  "2k": 2048,
  "4k": 4096,
  "8k": 8192,
};

const ringSizes: Record<Quality, number> = {
  "1k": 1024,
  "2k": 2048,
  "4k": 4096,
  "8k": 8192,
};

function getRawTextureRoot() {
  return path.join(process.cwd(), "data", "raw", "planet-textures");
}

function getGeneratedManifestPath() {
  return path.join(process.cwd(), "data", "generated", "official-texture-manifest.json");
}

function getOutputFilePath(bodyId: string, mapKey: string, quality: Quality) {
  return path.join(
    process.cwd(),
    "public",
    "textures",
    "planets",
    bodyId,
    `${mapKey.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}-${quality}.png`,
  );
}

async function runSips(args: string[]) {
  await execFile("sips", args);
}

async function downloadWithCurl(url: string, targetPath: string) {
  await ensureDir(path.dirname(targetPath));
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await execFile("curl", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    url,
    "--output",
    tempPath,
  ]);
  await fs.rename(tempPath, targetPath);
}

async function getImageSize(filePath: string) {
  const { stdout } = await execFile("sips", [
    "-g",
    "pixelWidth",
    "-g",
    "pixelHeight",
    filePath,
  ]);

  const widthMatch = stdout.match(/pixelWidth:\s+(\d+)/);
  const heightMatch = stdout.match(/pixelHeight:\s+(\d+)/);

  if (!widthMatch || !heightMatch) {
    throw new Error(`Unable to read dimensions via sips for ${filePath}`);
  }

  return {
    width: Number(widthMatch[1]),
    height: Number(heightMatch[1]),
  };
}

async function resizeToPng(sourcePath: string, outputPath: string, width: number) {
  await ensureDir(path.dirname(outputPath));
  await runSips([
    "-s",
    "format",
    "png",
    "--resampleWidth",
    String(width),
    sourcePath,
    "--out",
    outputPath,
  ]);
}

function extractGlbImages(glb: Buffer): ExtractedGlbImage[] {
  if (glb.length < 20) {
    throw new Error("GLB file is too small");
  }

  const magic = glb.readUInt32LE(0);
  const version = glb.readUInt32LE(4);
  if (magic !== 0x46546c67 || version !== 2) {
    throw new Error("Unsupported GLB format");
  }

  let offset = 12;
  let jsonChunk: Buffer | null = null;
  let binaryChunk: Buffer | null = null;

  while (offset + 8 <= glb.length) {
    const chunkLength = glb.readUInt32LE(offset);
    const chunkType = glb.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > glb.length) {
      throw new Error("Invalid GLB chunk length");
    }

    const chunk = glb.subarray(chunkStart, chunkEnd);
    if (chunkType === 0x4e4f534a) {
      jsonChunk = chunk;
    } else if (chunkType === 0x004e4942) {
      binaryChunk = chunk;
    }

    offset = chunkEnd;
  }

  if (!jsonChunk || !binaryChunk) {
    throw new Error("GLB is missing JSON or BIN chunk");
  }

  const document = JSON.parse(jsonChunk.toString("utf8").replace(/\u0000+$/g, "")) as {
    images?: Array<{ bufferView?: number; mimeType?: string; name?: string }>;
    bufferViews?: Array<{ byteOffset?: number; byteLength: number }>;
  };

  if (!document.images || !document.bufferViews) {
    return [];
  }

  return document.images.flatMap((image, index) => {
    if (typeof image.bufferView !== "number" || !image.mimeType) {
      return [];
    }

    const view = document.bufferViews?.[image.bufferView];
    if (!view) {
      return [];
    }

    const byteOffset = view.byteOffset ?? 0;
    const byteEnd = byteOffset + view.byteLength;
    const buffer = binaryChunk.subarray(byteOffset, byteEnd);

    return [{
      name: image.name ?? `image-${index}`,
      mimeType: image.mimeType,
      buffer,
    }];
  });
}

function getExtensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  throw new Error(`Unsupported embedded image mime type: ${mimeType}`);
}

async function ensureDownloadedRawAsset(entry: TextureManifestEntry, force: boolean) {
  const bodyRoot = path.join(getRawTextureRoot(), entry.bodyId);
  const targetPath = path.join(bodyRoot, entry.download.fileName);

  if (!force && await pathExists(targetPath)) {
    return targetPath;
  }

  logStep(`Downloading official texture source for ${entry.bodyId}`);
  try {
    const buffer = await fetchBinary(
      entry.download.url,
      Number(process.env.SYNC_TIMEOUT_MS ?? 60_000),
    );
    await writeBinaryFile(targetPath, buffer);
  } catch (error) {
    logWarning(
      `fetch() failed for ${entry.bodyId}; retrying with curl. ${String(error)}`,
    );
    await downloadWithCurl(entry.download.url, targetPath);
  }
  return targetPath;
}

async function extractEmbeddedImages(
  entry: TextureManifestEntry,
  glbPath: string,
  force: boolean,
) {
  const extractRoot = path.join(getRawTextureRoot(), entry.bodyId, "extracted");

  if (force && await pathExists(extractRoot)) {
    await fs.rm(extractRoot, { recursive: true, force: true });
  }

  await ensureDir(extractRoot);
  const glb = await fs.readFile(glbPath);
  const images = extractGlbImages(glb);

  for (const image of images) {
    const extension = getExtensionForMimeType(image.mimeType);
    const filePath = path.join(extractRoot, `${image.name}.${extension}`);
    await writeBinaryFile(filePath, image.buffer);
  }

  return images.map((image) => ({
    ...image,
    filePath: path.join(extractRoot, `${image.name}.${getExtensionForMimeType(image.mimeType)}`),
  }));
}

async function selectOutputSource(
  entry: TextureManifestEntry,
  output: TextureManifestEntry["outputs"][number],
  rawAssetPath: string,
  force: boolean,
) {
  if (entry.download.kind === "direct_raster") {
    return rawAssetPath;
  }

  const extracted = await extractEmbeddedImages(entry, rawAssetPath, force);
  const selected = extracted.find((image) =>
    output.nameIncludes ? image.name.includes(output.nameIncludes) : true,
  );

  if (!selected) {
    throw new Error(
      `Could not find embedded image for ${entry.bodyId}:${output.mapKey} matching "${output.nameIncludes ?? "*"}"`,
    );
  }

  return selected.filePath;
}

async function buildOfficialOutputs(
  entry: TextureManifestEntry,
  rawAssetPath: string,
  force: boolean,
) {
  const profile = getPlanetAppearanceProfile(entry.bodyId);
  if (!profile) {
    logWarning(`No appearance profile found for ${entry.bodyId}; skipping official texture sync`);
    return null;
  }

  const generatedOutputs: Record<string, string[]> = {};
  const sourceFiles: Record<string, string> = {};
  const nativeResolution: Record<string, { width: number; height: number }> = {};

  for (const output of entry.outputs) {
    const sourcePath = await selectOutputSource(entry, output, rawAssetPath, force);
    sourceFiles[output.mapKey] = sourcePath;
    nativeResolution[output.mapKey] = await getImageSize(sourcePath);

    for (const quality of profile.mipTiers) {
      const width = output.sourceKind === "ring" ? ringSizes[quality] : regularSizes[quality];
      const targetPath = getOutputFilePath(entry.bodyId, output.mapKey, quality);
      await resizeToPng(sourcePath, targetPath, width);
      const primaryOutputs = (generatedOutputs[output.mapKey] ??= []);
      primaryOutputs.push(targetPath);

      for (const duplicateKey of output.duplicateTo ?? []) {
        const duplicatePath = getOutputFilePath(entry.bodyId, duplicateKey, quality);
        await ensureDir(path.dirname(duplicatePath));
        await fs.copyFile(targetPath, duplicatePath);
        const duplicateOutputs = (generatedOutputs[duplicateKey] ??= []);
        duplicateOutputs.push(duplicatePath);
      }
    }
  }

  return {
    bodyId: entry.bodyId,
    sourceType: entry.sourceType as PlanetTextureSourceType,
    sourcePage: entry.sourcePage,
    rawAssetPath,
    sourceFiles,
    nativeResolution,
    generatedOutputs,
  };
}

async function main() {
  const entries = textureManifestSchema.parse(textureManifestJson);
  const force = process.env.FORCE_TEXTURE_SYNC === "1";
  const results: unknown[] = [];

  for (const entry of entries) {
    try {
      const rawAssetPath = await ensureDownloadedRawAsset(entry, force);
      const result = await buildOfficialOutputs(entry, rawAssetPath, force);
      if (result) {
        results.push(result);
        logStep(`Synced official texture derivatives for ${entry.bodyId}`);
      }
    } catch (error) {
      logWarning(
        `Failed to sync official texture for ${entry.bodyId}; keeping generated fallback. ${String(error)}`,
      );
    }
  }

  await writeJsonFile(getGeneratedManifestPath(), results);
  logStep(`Wrote official texture manifest for ${results.length} bodies`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] syncOfficialPlanetTextures failed: ${String(error)}\n`);
  process.exit(1);
});
