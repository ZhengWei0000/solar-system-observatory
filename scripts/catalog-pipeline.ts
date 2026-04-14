import path from "node:path";

import type {
  Body,
  BodySourceGroups,
  OrbitManifestItem,
  OrbitPreset,
  PlanetSystem,
} from "@/types";

import { readJsonFile } from "./utils";

export const SOURCE_URLS = {
  horizons: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
  horizonsLookup: "https://ssd-api.jpl.nasa.gov/doc/horizons_lookup.html",
  satelliteOrbits: "https://ssd.jpl.nasa.gov/sats/orbits.html",
  satellitePhysical: "https://ssd.jpl.nasa.gov/sats/phys_par/",
  satelliteDiscovery: "https://ssd.jpl.nasa.gov/sats/discovery.html",
  planetPhysical: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
  nasaSolarSystem: "https://science.nasa.gov/solar-system/",
} as const;

export const ORBIT_SOURCE_REFERENCE =
  "Reference orbit geometry for educational visualization. Use cached Horizons vectors where available for real trajectories.";
export const ORBIT_SOURCE_HORIZONS =
  "JPL Horizons vectors sampled offline and cached locally for visualization. Frontend reads cached results and does not call Horizons directly.";
export const SHAPE_SOURCE_REFERENCE =
  "Current local bundle uses a scientific approximation unless a traceable official/research asset is bundled.";
export const PLANET_PHYSICAL_SOURCE = "JPL SSD Planetary Physical Parameters";
export const SATELLITE_PHYSICAL_SOURCE = "JPL SSD Planetary Satellite Physical Parameters";

export interface CuratedBodyOverride extends Partial<Omit<Body, "id">> {
  id: string;
}

export interface CuratedSystemOverride extends Partial<Omit<PlanetSystem, "id">> {
  id: string;
}

export type PrimaryBodySeed = Pick<
  Body,
  | "id"
  | "slug"
  | "officialName"
  | "englishName"
  | "bodyType"
  | "parentId"
  | "systemId"
  | "horizonsId"
  | "naifId"
>;

export const PRIMARY_BODY_SEEDS: PrimaryBodySeed[] = [
  {
    id: "sun",
    slug: "sun",
    officialName: "Sun",
    englishName: "Sun",
    bodyType: "star",
    parentId: null,
    systemId: null,
    horizonsId: "10",
    naifId: "10",
  },
  {
    id: "mercury",
    slug: "mercury",
    officialName: "Mercury",
    englishName: "Mercury",
    bodyType: "planet",
    parentId: "sun",
    systemId: null,
    horizonsId: "199",
    naifId: "199",
  },
  {
    id: "venus",
    slug: "venus",
    officialName: "Venus",
    englishName: "Venus",
    bodyType: "planet",
    parentId: "sun",
    systemId: null,
    horizonsId: "299",
    naifId: "299",
  },
  {
    id: "earth",
    slug: "earth",
    officialName: "Earth",
    englishName: "Earth",
    bodyType: "planet",
    parentId: "sun",
    systemId: "system-earth",
    horizonsId: "399",
    naifId: "399",
  },
  {
    id: "mars",
    slug: "mars",
    officialName: "Mars",
    englishName: "Mars",
    bodyType: "planet",
    parentId: "sun",
    systemId: "system-mars",
    horizonsId: "499",
    naifId: "499",
  },
  {
    id: "jupiter",
    slug: "jupiter",
    officialName: "Jupiter",
    englishName: "Jupiter",
    bodyType: "planet",
    parentId: "sun",
    systemId: "system-jupiter",
    horizonsId: "599",
    naifId: "599",
  },
  {
    id: "saturn",
    slug: "saturn",
    officialName: "Saturn",
    englishName: "Saturn",
    bodyType: "planet",
    parentId: "sun",
    systemId: "system-saturn",
    horizonsId: "699",
    naifId: "699",
  },
  {
    id: "uranus",
    slug: "uranus",
    officialName: "Uranus",
    englishName: "Uranus",
    bodyType: "planet",
    parentId: "sun",
    systemId: "system-uranus",
    horizonsId: "799",
    naifId: "799",
  },
  {
    id: "neptune",
    slug: "neptune",
    officialName: "Neptune",
    englishName: "Neptune",
    bodyType: "planet",
    parentId: "sun",
    systemId: "system-neptune",
    horizonsId: "899",
    naifId: "899",
  },
  {
    id: "pluto",
    slug: "pluto",
    officialName: "Pluto",
    englishName: "Pluto",
    bodyType: "dwarf_planet",
    parentId: "sun",
    systemId: "system-pluto",
    horizonsId: "999",
    naifId: "999",
  },
  {
    id: "moon",
    slug: "moon",
    officialName: "Moon",
    englishName: "Moon",
    bodyType: "natural_satellite",
    parentId: "earth",
    systemId: "system-earth",
    horizonsId: "301",
    naifId: "301",
  },
];

export const SYSTEM_PRESET_BY_SYSTEM_ID: Partial<Record<string, OrbitPreset>> = {
  "system-earth": "earth-system-current",
  "system-mars": "mars-system-current",
  "system-jupiter": "jupiter-system-current",
  "system-saturn": "saturn-system-current",
  "system-pluto": "pluto-system-current",
};

const curatedDir = path.join(process.cwd(), "data", "curated");

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBodyIdFromName(value: string) {
  return slugify(value);
}

export function getSystemIdForParentName(parentName: string) {
  switch (parentName.toLowerCase()) {
    case "earth":
      return "system-earth";
    case "mars":
      return "system-mars";
    case "jupiter":
      return "system-jupiter";
    case "saturn":
      return "system-saturn";
    case "uranus":
      return "system-uranus";
    case "neptune":
      return "system-neptune";
    case "pluto":
      return "system-pluto";
    default:
      return null;
  }
}

export async function loadCuratedBodyOverrides() {
  return (
    (await readJsonFile<CuratedBodyOverride[]>(path.join(curatedDir, "body-overrides.json"))) ?? []
  );
}

export async function loadCuratedSystemOverrides() {
  return (
    (await readJsonFile<CuratedSystemOverride[]>(path.join(curatedDir, "system-overrides.json"))) ?? []
  );
}

export async function loadNormalizedBodiesSnapshot() {
  return (await readJsonFile<Body[]>(path.join(process.cwd(), "data", "normalized", "bodies.json"))) ?? [];
}

export async function loadNormalizedSystemsSnapshot() {
  return (await readJsonFile<PlanetSystem[]>(path.join(process.cwd(), "data", "normalized", "systems.json"))) ?? [];
}

export async function loadOrbitManifestSnapshot() {
  return (
    (await readJsonFile<OrbitManifestItem[]>(
      path.join(process.cwd(), "data", "generated", "orbit-manifest.json"),
    )) ?? []
  );
}

export function mergeSourceGroups(...groups: Array<BodySourceGroups | undefined>) {
  const merged: BodySourceGroups = {};

  for (const key of ["orbit", "physical", "shape", "content"] as const) {
    const values = groups.flatMap((group) => group?.[key] ?? []);
    if (values.length > 0) {
      merged[key] = Array.from(new Set(values));
    }
  }

  return merged;
}

export function buildTemplateContent(name: string, chineseName: string, systemLabel?: string) {
  const parentText = systemLabel ? `属于${systemLabel}` : "已纳入当前目录";

  return {
    descriptionOneLine: `${chineseName}（${name}）是${parentText}的目录级已知天体。`,
    descriptionShort: `${chineseName}（${name}）已纳入当前站点的结构化目录。当前版本会优先保证其命名、系统归属、来源标签与轨道类型说明正确。`,
    descriptionMedium: `${chineseName}（${name}）当前详情页提供系统归属、参数卡、来源信息、轨道类型标记与模型等级说明。若缺少高精形状资源，站点会保留真实目录与参数数据，并明确标注模型是科学近似。`,
  };
}

export function buildSystemLabelMap(systems: PlanetSystem[]) {
  return new Map(
    systems.map((system) => [
      system.id,
      {
        name: system.name,
        chineseName: system.chineseName,
      },
    ]),
  );
}

export function createBaseBody(seed: PrimaryBodySeed, previous?: Body | null, curated?: CuratedBodyOverride) {
  const chineseName = curated?.chineseName ?? previous?.chineseName ?? seed.englishName;
  const template = buildTemplateContent(seed.englishName, chineseName);

  return {
    id: seed.id,
    slug: seed.slug,
    officialName: seed.officialName,
    chineseName,
    englishName: curated?.englishName ?? previous?.englishName ?? seed.englishName,
    aliases: curated?.aliases ?? previous?.aliases ?? [seed.officialName],
    bodyType: seed.bodyType,
    parentId: seed.parentId,
    systemId: curated?.systemId ?? previous?.systemId ?? seed.systemId,
    orbitSource: curated?.orbitSource ?? previous?.orbitSource ?? ORBIT_SOURCE_REFERENCE,
    physicalSource: curated?.physicalSource ?? previous?.physicalSource ?? PLANET_PHYSICAL_SOURCE,
    shapeSource: curated?.shapeSource ?? previous?.shapeSource ?? SHAPE_SOURCE_REFERENCE,
    modelGrade: curated?.modelGrade ?? previous?.modelGrade ?? "B",
    descriptionOneLine: curated?.descriptionOneLine ?? previous?.descriptionOneLine ?? template.descriptionOneLine,
    descriptionShort: curated?.descriptionShort ?? previous?.descriptionShort ?? template.descriptionShort,
    descriptionMedium: curated?.descriptionMedium ?? previous?.descriptionMedium ?? template.descriptionMedium,
    descriptionLong: curated?.descriptionLong ?? previous?.descriptionLong,
    radiusKm: curated?.radiusKm ?? previous?.radiusKm ?? null,
    meanRadiusKm: curated?.meanRadiusKm ?? previous?.meanRadiusKm ?? null,
    triAxialRadiiKm: curated?.triAxialRadiiKm ?? previous?.triAxialRadiiKm ?? null,
    massKg: curated?.massKg ?? previous?.massKg ?? null,
    density: curated?.density ?? previous?.density ?? null,
    gravity: curated?.gravity ?? previous?.gravity ?? null,
    escapeVelocity: curated?.escapeVelocity ?? previous?.escapeVelocity ?? null,
    albedo: curated?.albedo ?? previous?.albedo ?? null,
    rotationPeriodHours: curated?.rotationPeriodHours ?? previous?.rotationPeriodHours ?? null,
    orbitalPeriodDays: curated?.orbitalPeriodDays ?? previous?.orbitalPeriodDays ?? null,
    semiMajorAxisKm: curated?.semiMajorAxisKm ?? previous?.semiMajorAxisKm ?? null,
    eccentricity: curated?.eccentricity ?? previous?.eccentricity ?? null,
    inclinationDeg: curated?.inclinationDeg ?? previous?.inclinationDeg ?? null,
    discoveryText: curated?.discoveryText ?? previous?.discoveryText ?? null,
    texturePath: curated?.texturePath ?? previous?.texturePath ?? null,
    modelPath: curated?.modelPath ?? previous?.modelPath ?? null,
    thumbnailPath: curated?.thumbnailPath ?? previous?.thumbnailPath ?? null,
    hasHighFidelityShape: curated?.hasHighFidelityShape ?? previous?.hasHighFidelityShape ?? false,
    featured: curated?.featured ?? previous?.featured ?? false,
    lastSyncedAt: new Date().toISOString(),
    horizonsId: curated?.horizonsId ?? previous?.horizonsId ?? seed.horizonsId,
    naifId: curated?.naifId ?? previous?.naifId ?? seed.naifId,
    provisionalDesignation: curated?.provisionalDesignation ?? previous?.provisionalDesignation ?? null,
    iauNumber: curated?.iauNumber ?? previous?.iauNumber ?? null,
    discoveryYear: curated?.discoveryYear ?? previous?.discoveryYear ?? null,
    orbitDataKind: curated?.orbitDataKind ?? previous?.orbitDataKind ?? "manual_reference",
    orbitAvailability: curated?.orbitAvailability ?? previous?.orbitAvailability ?? "reference_only",
    catalogStatus: curated?.catalogStatus ?? previous?.catalogStatus ?? "confirmed",
    sources: mergeSourceGroups(
      {
        orbit: [SOURCE_URLS.horizons, SOURCE_URLS.satelliteOrbits],
        physical: [SOURCE_URLS.planetPhysical],
        shape: [],
        content: [SOURCE_URLS.nasaSolarSystem],
      },
      previous?.sources,
      curated?.sources,
    ),
  } satisfies Body;
}

export function applyOrbitCoverageToSystems(
  systems: PlanetSystem[],
  manifest: OrbitManifestItem[],
) {
  const manifestByBodyId = new Map<string, OrbitManifestItem[]>();

  for (const item of manifest) {
    const list = manifestByBodyId.get(item.bodyId) ?? [];
    list.push(item);
    manifestByBodyId.set(item.bodyId, list);
  }

  return systems.map((system) => {
    const sampledBodyIds = system.memberIds.filter((bodyId) =>
      (manifestByBodyId.get(bodyId) ?? []).some((item) => !item.isReferenceOnly),
    );
    const referenceOnlyBodyIds = system.memberIds.filter((bodyId) =>
      (manifestByBodyId.get(bodyId) ?? []).some((item) => item.isReferenceOnly),
    );

    return {
      ...system,
      orbitCoverage: {
        sampledBodyIds,
        referenceOnlyBodyIds,
      },
    };
  });
}

export function buildSystemsFromBodies(
  bodies: Body[],
  previousSystems: PlanetSystem[],
  overrides: CuratedSystemOverride[],
  manifest: OrbitManifestItem[] = [],
) {
  const previousById = new Map(previousSystems.map((system) => [system.id, system]));
  const overrideById = new Map(overrides.map((system) => [system.id, system]));
  const systems = Array.from(
    new Set(bodies.map((body) => body.systemId).filter((value): value is string => Boolean(value))),
  ).map((systemId) => {
    const members = bodies
      .filter((body) => body.systemId === systemId)
      .sort((a, b) => a.englishName.localeCompare(b.englishName));
    const primary =
      members.find((body) => body.id === systemId.replace("system-", "")) ??
      members.find((body) => body.bodyType === "planet" || body.bodyType === "dwarf_planet") ??
      null;
    const previous = previousById.get(systemId);
    const override = overrideById.get(systemId);

    return {
      id: systemId,
      slug: override?.slug ?? previous?.slug ?? systemId.replace(/^system-/, ""),
      name: override?.name ?? previous?.name ?? `${primary?.englishName ?? systemId} System`,
      chineseName: override?.chineseName ?? previous?.chineseName ?? `${primary?.chineseName ?? systemId}系统`,
      primaryBodyId: override?.primaryBodyId ?? previous?.primaryBodyId ?? primary?.id ?? members[0]?.id ?? "",
      memberIds: members.map((body) => body.id),
      featuredBodyIds:
        override?.featuredBodyIds ??
        previous?.featuredBodyIds ??
        members.filter((body) => body.featured).map((body) => body.id).slice(0, 6),
      stats: {
        totalBodies: members.length,
        naturalSatellites: members.filter((body) => body.bodyType === "natural_satellite").length,
        withHighFidelityShape: members.filter((body) => body.hasHighFidelityShape).length,
      },
      orbitCoverage: {
        sampledBodyIds: previous?.orbitCoverage.sampledBodyIds ?? [],
        referenceOnlyBodyIds: previous?.orbitCoverage.referenceOnlyBodyIds ?? [],
      },
      description: {
        oneLine:
          override?.description?.oneLine ??
          previous?.description.oneLine ??
          `${primary?.chineseName ?? primary?.englishName ?? "该系统"}是当前站点的结构化系统入口。`,
        short:
          override?.description?.short ??
          previous?.description.short ??
          "系统页会同时展示主星、天然卫星、轨道类型说明与来源标签。",
      },
    } satisfies PlanetSystem;
  });

  return applyOrbitCoverageToSystems(systems, manifest);
}
