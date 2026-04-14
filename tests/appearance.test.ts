import path from "node:path";
import { promises as fs } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getPlanetAppearanceProfile,
  getPlanetQualityTier,
  listBundledAppearanceMaps,
  planetAppearanceProfiles,
} from "@/lib/appearance/planet-appearance";

type AssetManifestEntry = {
  id: string;
  renderMode: string | null;
  bundledRasterMaps:
    | {
        overview: string[];
        system: string[];
        detail: string[];
      }
    | null;
  fallbackMaps:
    | {
        overview: string[];
        system: string[];
        detail: string[];
      }
    | null;
  qualityTier:
    | {
        overview: string;
        system: string;
        detail: string;
      }
    | null;
  maxDetailTier: string | null;
  textureFormat: string | null;
  mipTiers: string[];
  postFxTier: string | null;
  textureSourceType: string | null;
  textureSourceNote: string | null;
  usesOfficialMesh: boolean;
  textureSourceLinks: string[];
};

async function readAssetManifest() {
  const filePath = path.join(process.cwd(), "data", "generated", "asset-manifest.json");
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as AssetManifestEntry[];
}

describe("planet appearance", () => {
  it("defines offline appearance profiles for all primary planets plus the sun and pluto", () => {
    expect(planetAppearanceProfiles.map((profile) => profile.bodyId)).toEqual([
      "sun",
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto",
    ]);
  });

  it("resolves local bundled textures for every configured appearance profile", async () => {
    for (const profile of planetAppearanceProfiles) {
      const detailQuality = getPlanetQualityTier(profile, "detail");
      const maps = listBundledAppearanceMaps(profile, detailQuality);

      if (profile.renderMode === "star") {
        expect(maps.length).toBe(0);
        continue;
      }

      expect(maps.length).toBeGreaterThan(0);

      for (const [, publicPath] of maps) {
        const localPath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
        await expect(fs.access(localPath)).resolves.toBeUndefined();
      }
    }
  });

  it("writes appearance-aware asset manifest entries", async () => {
    const manifest = await readAssetManifest();
    const earth = manifest.find((entry) => entry.id === "earth");
    const saturn = manifest.find((entry) => entry.id === "saturn");
    const mercury = manifest.find((entry) => entry.id === "mercury");
    const neptune = manifest.find((entry) => entry.id === "neptune");

    expect(earth?.renderMode).toBe("clouded_rocky");
    expect(earth?.qualityTier?.detail).toBe("8k");
    expect(earth?.maxDetailTier).toBe("8k");
    expect(earth?.textureFormat).toBe("png");
    expect(earth?.textureSourceType).toBe("official_model_texture");
    expect(earth?.bundledRasterMaps?.detail).toContain("/textures/planets/earth/albedo-8k.png");
    expect(earth?.fallbackMaps?.detail).toContain("/textures/planets/earth/albedo-4k.svg");
    expect(saturn?.bundledRasterMaps?.detail).toContain("/textures/planets/saturn/ring-alpha-8k.png");
    expect(saturn?.textureSourceType).toBe("official_model_texture");
    expect(mercury?.usesOfficialMesh).toBe(false);
    expect(neptune?.postFxTier).toBe("cinematic");
  });

  it("can look up the detailed appearance profile for earth", () => {
    const earth = getPlanetAppearanceProfile("earth");

    expect(earth?.maps.nightLights).toBe("/textures/planets/earth/night-lights-{quality}.png");
    expect(earth?.specularMap).toBe("/textures/planets/earth/specular-{quality}.png");
    expect(earth?.mipTiers).toEqual(["1k", "2k", "4k", "8k"]);
    expect(earth?.textureSourceType).toBe("official_model_texture");
    expect(earth?.geometry.useOfficialMesh).toBe(false);
  });
});
