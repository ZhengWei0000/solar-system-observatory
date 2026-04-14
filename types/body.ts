export const BODY_TYPES = [
  "star",
  "planet",
  "natural_satellite",
  "dwarf_planet",
  "system_anchor",
] as const;

export const MODEL_GRADES = ["S", "A", "B", "C"] as const;

export const ORBIT_DATA_KINDS = [
  "horizons_sampled",
  "mean_elements_reference",
  "manual_reference",
] as const;

export const CATALOG_STATUSES = ["confirmed", "provisional"] as const;

export const ORBIT_AVAILABILITY = [
  "horizons_cached",
  "reference_only",
  "unresolved",
] as const;

export const ORBIT_PRESETS = [
  "overview-current",
  "earth-system-current",
  "mars-system-current",
  "jupiter-system-current",
  "saturn-system-current",
  "pluto-system-current",
] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type ModelGrade = (typeof MODEL_GRADES)[number];
export type OrbitDataKind = (typeof ORBIT_DATA_KINDS)[number];
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];
export type OrbitAvailability = (typeof ORBIT_AVAILABILITY)[number];
export type OrbitPreset = (typeof ORBIT_PRESETS)[number];

export interface BodySourceGroups {
  orbit?: string[];
  physical?: string[];
  shape?: string[];
  content?: string[];
}

export interface Body {
  id: string;
  slug: string;
  officialName: string;
  chineseName: string;
  englishName: string;
  aliases: string[];
  bodyType: BodyType;
  parentId: string | null;
  systemId: string | null;
  orbitSource: string;
  physicalSource: string;
  shapeSource: string;
  modelGrade: ModelGrade;
  descriptionOneLine: string;
  descriptionShort: string;
  descriptionMedium: string;
  descriptionLong?: string;
  radiusKm?: number | null;
  meanRadiusKm?: number | null;
  triAxialRadiiKm?: [number, number, number] | null;
  massKg?: number | null;
  density?: number | null;
  gravity?: number | null;
  escapeVelocity?: number | null;
  albedo?: number | null;
  rotationPeriodHours?: number | null;
  orbitalPeriodDays?: number | null;
  semiMajorAxisKm?: number | null;
  eccentricity?: number | null;
  inclinationDeg?: number | null;
  discoveryText?: string | null;
  texturePath?: string | null;
  modelPath?: string | null;
  thumbnailPath?: string | null;
  hasHighFidelityShape: boolean;
  featured: boolean;
  lastSyncedAt: string;
  horizonsId: string | null;
  naifId: string | null;
  provisionalDesignation: string | null;
  iauNumber: string | null;
  discoveryYear: number | null;
  orbitDataKind: OrbitDataKind;
  orbitAvailability: OrbitAvailability;
  catalogStatus: CatalogStatus;
  sources: BodySourceGroups;
}

export interface PlanetSystem {
  id: string;
  slug: string;
  name: string;
  chineseName: string;
  primaryBodyId: string;
  memberIds: string[];
  featuredBodyIds: string[];
  stats: {
    totalBodies: number;
    naturalSatellites: number;
    withHighFidelityShape: number;
  };
  orbitCoverage: {
    sampledBodyIds: string[];
    referenceOnlyBodyIds: string[];
  };
  description: {
    oneLine: string;
    short: string;
  };
}

export interface OrbitSamplePoint {
  t: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface OrbitSample {
  bodyId: string;
  preset: OrbitPreset;
  source: string;
  centerBodyId: string;
  frame: string;
  refPlane: string;
  refSystem: string;
  units: string;
  generatedAt: string;
  requestedRange: {
    start: string;
    stop: string;
    step: string;
  };
  sampleStart: string;
  sampleEnd: string;
  stepHours: number;
  points: OrbitSamplePoint[];
  isReferenceOnly: boolean;
}

export interface OrbitManifestItem {
  bodyId: string;
  preset: OrbitPreset;
  source: string;
  centerBodyId: string;
  orbitDataKind: OrbitDataKind;
  orbitAvailability: OrbitAvailability;
  generatedAt: string;
  sampleStart: string;
  sampleEnd: string;
  stepHours: number;
  frame: string;
  refPlane: string;
  refSystem: string;
  units: string;
  isReferenceOnly: boolean;
}

export interface FeaturedTopic {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  readingMinutes: number;
  keyLearnings: string[];
  sources: TopicSource[];
}

export interface TopicSource {
  title: string;
  publisher: string;
  url: string;
  reliability: "official" | "peer_review";
}

export interface SearchIndexItem {
  id: string;
  slug: string;
  names: string[];
  aliases: string[];
  systemNames: string[];
  bodyType: BodyType;
  modelGrade: ModelGrade;
  descriptionOneLine: string;
  systemSlug: string | null;
  tokens: string[];
}
