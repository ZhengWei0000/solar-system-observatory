export const PLANET_RENDER_MODES = [
  "star",
  "rocky",
  "clouded_rocky",
  "gas_giant",
  "ice_giant",
  "dwarf_ice",
] as const;

export const PLANET_TEXTURE_QUALITY = ["1k", "2k", "4k", "8k"] as const;
export const PLANET_TEXTURE_FORMATS = ["png", "svg"] as const;
export const PLANET_POST_FX_TIERS = ["minimal", "cinematic", "heroic"] as const;
export const PLANET_TEXTURE_SOURCE_TYPES = [
  "official_observational",
  "official_model_texture",
  "official_interpreted",
  "generated_fallback",
] as const;

export type PlanetRenderMode = (typeof PLANET_RENDER_MODES)[number];
export type PlanetTextureQuality = (typeof PLANET_TEXTURE_QUALITY)[number];
export type PlanetTextureFormat = (typeof PLANET_TEXTURE_FORMATS)[number];
export type PlanetPostFxTier = (typeof PLANET_POST_FX_TIERS)[number];
export type PlanetTextureSourceType = (typeof PLANET_TEXTURE_SOURCE_TYPES)[number];

export interface PlanetAppearanceMaps {
  albedo?: string | null;
  bump?: string | null;
  normal?: string | null;
  roughness?: string | null;
  emissive?: string | null;
  clouds?: string | null;
  nightLights?: string | null;
  specular?: string | null;
  ringColor?: string | null;
  ringAlpha?: string | null;
  ringRoughness?: string | null;
}

export interface PlanetAppearanceProfile {
  bodyId: string;
  renderMode: PlanetRenderMode;
  textureFormat: PlanetTextureFormat;
  textureSourceType: PlanetTextureSourceType;
  textureSourceNote: string;
  supportMapSourceNote?: string | null;
  mipTiers: PlanetTextureQuality[];
  maps: PlanetAppearanceMaps;
  fallbackMaps?: PlanetAppearanceMaps;
  detailMaps?: PlanetAppearanceMaps;
  specularMap?: string | null;
  ringRoughness?: string | null;
  quality: {
    overview: "1k" | "2k";
    system: "1k" | "2k";
    detail: "4k" | "8k";
  };
  material: {
    roughness: number;
    metalness: number;
    normalScale: number;
    bumpScale: number;
    emissiveIntensity: number;
    atmosphereColor: string;
    atmosphereIntensity: number;
    fresnelPower: number;
    cloudSpeed: number;
  };
  geometry: {
    useOfficialMesh: boolean;
    modelPath?: string | null;
    axialTiltDeg?: number | null;
  };
  postFxTier: PlanetPostFxTier;
  textureSources: string[];
  sourceLinks: string[];
}
