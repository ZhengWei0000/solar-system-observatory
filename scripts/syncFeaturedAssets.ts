/**
 * Generates the local asset manifest for featured bodies.
 *
 * The manifest intentionally distinguishes between:
 * - source-backed official assets
 * - locally bundled model availability
 * - current fallback rendering mode
 */
import path from "node:path";

import {
  listFallbackAppearanceMaps,
  getPlanetAppearanceProfile,
  getPlanetQualityTier,
  listBundledAppearanceMaps,
} from "../lib/appearance/planet-appearance";
import { loadNormalizedBodiesSnapshot } from "./catalog-pipeline";
import { logStep, writeJsonFile } from "./utils";

async function main() {
  const assetManifestPath = path.join(process.cwd(), "data", "generated", "asset-manifest.json");
  const bodies = (await loadNormalizedBodiesSnapshot()).filter(
    (body) => body.featured || Boolean(getPlanetAppearanceProfile(body.id)),
  );

  const manifest = bodies.map((body) => {
    const profile = getPlanetAppearanceProfile(body.id);
    const qualityTier = profile
      ? {
          overview: getPlanetQualityTier(profile, "overview"),
          system: getPlanetQualityTier(profile, "system"),
          detail: getPlanetQualityTier(profile, "detail"),
        }
      : null;
    const bundledMaps = profile && qualityTier
      ? {
          overview: listBundledAppearanceMaps(profile, qualityTier.overview).map(([, value]) => value),
          system: listBundledAppearanceMaps(profile, qualityTier.system).map(([, value]) => value),
          detail: listBundledAppearanceMaps(profile, qualityTier.detail).map(([, value]) => value),
        }
      : null;
    const fallbackMaps = profile && qualityTier
      ? {
          overview: listFallbackAppearanceMaps(profile, qualityTier.overview).map(([, value]) => value),
          system: listFallbackAppearanceMaps(profile, qualityTier.system).map(([, value]) => value),
          detail: listFallbackAppearanceMaps(
            profile,
            qualityTier.detail === "8k" ? "4k" : qualityTier.detail,
          ).map(([, value]) => value),
        }
      : null;
    const sourceLinks = Array.from(
      new Set([...(body.sources.shape ?? []), ...(profile?.sourceLinks ?? [])]),
    );
    const textureSourceLinks = Array.from(new Set(profile?.textureSources ?? []));

    return {
      id: body.id,
      slug: body.slug,
      officialName: body.officialName,
      currentModelGrade: body.modelGrade,
      currentModelPath: body.modelPath,
      currentTexturePath: body.texturePath,
      currentHasBundledHighFidelityAsset: body.hasHighFidelityShape,
      renderMode: profile?.renderMode ?? null,
      bundledRasterMaps: bundledMaps,
      fallbackMaps,
      bundledModelPath: profile?.geometry.modelPath ?? body.modelPath ?? null,
      qualityTier,
      maxDetailTier: profile?.quality.detail ?? null,
      textureFormat: profile?.textureFormat ?? null,
      mipTiers: profile?.mipTiers ?? [],
      postFxTier: profile?.postFxTier ?? null,
      textureSourceType: profile?.textureSourceType ?? null,
      textureSourceNote: profile?.textureSourceNote ?? null,
      usesOfficialMesh: profile?.geometry.useOfficialMesh ?? false,
      textureSourceLinks,
      shapeSource: body.shapeSource,
      sourceLinks,
    };
  });

  await writeJsonFile(assetManifestPath, manifest);
  logStep(`Wrote featured asset manifest for ${manifest.length} bodies`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] syncFeaturedAssets failed: ${String(error)}\n`);
  process.exit(1);
});
