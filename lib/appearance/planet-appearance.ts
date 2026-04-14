import { z } from "zod";

import type {
  PlanetAppearanceProfile,
  PlanetTextureQuality,
} from "@/types";
import {
  PLANET_RENDER_MODES,
  PLANET_TEXTURE_FORMATS,
  PLANET_TEXTURE_QUALITY,
  PLANET_POST_FX_TIERS,
  PLANET_TEXTURE_SOURCE_TYPES,
} from "@/types";

import appearanceJson from "@/data/curated/planet-appearance.json";

const mapsSchema = z
  .object({
    albedo: z.string().nullable().optional(),
    bump: z.string().nullable().optional(),
    normal: z.string().nullable().optional(),
    roughness: z.string().nullable().optional(),
    emissive: z.string().nullable().optional(),
    clouds: z.string().nullable().optional(),
    nightLights: z.string().nullable().optional(),
    specular: z.string().nullable().optional(),
    ringColor: z.string().nullable().optional(),
    ringAlpha: z.string().nullable().optional(),
    ringRoughness: z.string().nullable().optional(),
  })
  .strict();

const profileSchema = z
  .object({
    bodyId: z.string(),
    renderMode: z.enum(PLANET_RENDER_MODES),
    textureFormat: z.enum(PLANET_TEXTURE_FORMATS),
    textureSourceType: z.enum(PLANET_TEXTURE_SOURCE_TYPES),
    textureSourceNote: z.string(),
    supportMapSourceNote: z.string().nullable().optional(),
    mipTiers: z.array(z.enum(PLANET_TEXTURE_QUALITY)).min(1),
    maps: mapsSchema,
    fallbackMaps: mapsSchema.optional(),
    detailMaps: mapsSchema.optional(),
    specularMap: z.string().nullable().optional(),
    ringRoughness: z.string().nullable().optional(),
    quality: z
      .object({
        overview: z.enum(["1k", "2k"]),
        system: z.enum(["1k", "2k"]),
        detail: z.enum(["4k", "8k"]),
      })
      .strict(),
    material: z
      .object({
        roughness: z.number(),
        metalness: z.number(),
        normalScale: z.number(),
        bumpScale: z.number(),
        emissiveIntensity: z.number(),
        atmosphereColor: z.string(),
        atmosphereIntensity: z.number(),
        fresnelPower: z.number(),
        cloudSpeed: z.number(),
      })
      .strict(),
    geometry: z
      .object({
        useOfficialMesh: z.boolean(),
        modelPath: z.string().nullable().optional(),
        axialTiltDeg: z.number().nullable().optional(),
      })
      .strict(),
    postFxTier: z.enum(PLANET_POST_FX_TIERS),
    textureSources: z.array(z.string()),
    sourceLinks: z.array(z.string()),
  })
  .strict();

export const planetAppearanceProfiles = z.array(profileSchema).parse(
  appearanceJson,
) as PlanetAppearanceProfile[];

const profileByBodyId = new Map(
  planetAppearanceProfiles.map((profile) => [profile.bodyId, profile]),
);

export function getPlanetAppearanceProfile(bodyId: string) {
  return profileByBodyId.get(bodyId) ?? null;
}

export type PlanetPresentationTier =
  | "overview"
  | "system"
  | "detail"
  | "hero";

export function getPlanetQualityTier(
  profile: PlanetAppearanceProfile,
  tier: PlanetPresentationTier,
  mobile = false,
): PlanetTextureQuality {
  if (mobile) {
    if (tier === "detail" || tier === "hero") {
      if (profile.mipTiers.includes("2k")) {
        return "2k";
      }
    }

    return profile.mipTiers.includes("1k") ? "1k" : profile.mipTiers[0]!;
  }

  if (tier === "hero") {
    return profile.mipTiers.includes("4k") ? "4k" : profile.quality.detail;
  }

  if (tier === "detail") {
    return profile.quality.detail;
  }

  return profile.quality[tier];
}

export function resolveAppearanceMapPath(
  pathTemplate: string | null | undefined,
  quality: PlanetTextureQuality,
) {
  if (!pathTemplate) {
    return null;
  }

  if (pathTemplate.includes("{quality}")) {
    return pathTemplate.replaceAll("{quality}", quality);
  }

  return pathTemplate;
}

export function listBundledAppearanceMaps(
  profile: PlanetAppearanceProfile,
  quality: PlanetTextureQuality,
) {
  return Object.entries({
    ...profile.maps,
    ...profile.detailMaps,
    specular: profile.specularMap ?? profile.maps.specular ?? null,
    ringRoughness: profile.ringRoughness ?? profile.maps.ringRoughness ?? null,
  })
    .map(([key, pathTemplate]) => [
      key,
      resolveAppearanceMapPath(pathTemplate ?? null, quality),
    ] as const)
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
}

export function listFallbackAppearanceMaps(
  profile: PlanetAppearanceProfile,
  quality: PlanetTextureQuality,
) {
  return Object.entries(profile.fallbackMaps ?? {})
    .map(([key, pathTemplate]) => [
      key,
      resolveAppearanceMapPath(pathTemplate ?? null, quality),
    ] as const)
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
}

export function getAppearanceTextureSourceSummary(bodyId: string) {
  const profile = getPlanetAppearanceProfile(bodyId);

  if (!profile) {
    return null;
  }

  return profile.textureSourceNote;
}

export function getAppearanceShapeSourceSummary(
  bodyId: string,
  fallbackShapeSource: string,
) {
  const profile = getPlanetAppearanceProfile(bodyId);

  if (!profile) {
    return fallbackShapeSource;
  }

  if (profile.geometry.useOfficialMesh) {
    return "当前详情页已接入可追溯官方/科研 mesh，并叠加本地离线高精贴图、大气层与光照表现。";
  }

  return "当前详情页使用本地离线高质量科学近似行星材质：真实参数 + 高精栅格贴图/程序化云层/大气层，视觉增强不等同于真实形状扫描。";
}
