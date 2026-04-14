import path from "node:path";

import { parseSatelliteDiscoveryPage } from "@/lib/adapters/jpl-ssd/parse-discovery";
import type { SatelliteDiscoveryRecord } from "@/lib/adapters/jpl-ssd/types";
import type { Body } from "@/types";

import {
  buildSystemsFromBodies,
  buildTemplateContent,
  type CuratedBodyOverride,
  createBaseBody,
  getBodyIdFromName,
  getSystemIdForParentName,
  loadCuratedBodyOverrides,
  loadCuratedSystemOverrides,
  loadNormalizedBodiesSnapshot,
  loadNormalizedSystemsSnapshot,
  loadOrbitManifestSnapshot,
  ORBIT_SOURCE_REFERENCE,
  PRIMARY_BODY_SEEDS,
  SATELLITE_PHYSICAL_SOURCE,
  SHAPE_SOURCE_REFERENCE,
  SOURCE_URLS,
} from "./catalog-pipeline";
import {
  fetchText,
  logStep,
  logWarning,
  pathExists,
  readTextFile,
  writeJsonFile,
  writeTextFile,
} from "./utils";

function buildDiscoveryUrl() {
  const baseUrl = process.env.JPL_SSD_BASE_URL ?? "https://ssd.jpl.nasa.gov";
  return new URL("/sats/discovery.html", baseUrl).toString();
}

async function loadDiscoveryHtml(rawPath: string) {
  try {
    const html = await fetchText(buildDiscoveryUrl(), Number(process.env.SYNC_TIMEOUT_MS ?? 30_000));
    await writeTextFile(rawPath, html);
    return html;
  } catch (error) {
    logWarning(`Failed to refresh JPL SSD discovery page: ${String(error)}`);
    const cached = await readTextFile(rawPath);
    if (cached) {
      logWarning("Falling back to cached SSD discovery snapshot.");
      return cached;
    }
    return null;
  }
}

function createSatelliteBody(
  record: SatelliteDiscoveryRecord,
  options: {
    previous: Body | null;
    curated: CuratedBodyOverride | null;
    lastSyncedAt: string;
  },
) {
  const id = getBodyIdFromName(record.officialName);
  const systemId = getSystemIdForParentName(record.parentName);
  const chineseName =
    options.curated?.chineseName ?? options.previous?.chineseName ?? record.officialName;
  const template = buildTemplateContent(
    record.officialName,
    chineseName,
    systemId ? systemId.replace("system-", "") : record.parentName,
  );

  return {
    id,
    slug: options.curated?.slug ?? options.previous?.slug ?? id,
    officialName: record.officialName,
    chineseName,
    englishName: options.curated?.englishName ?? options.previous?.englishName ?? record.officialName,
    aliases:
      options.curated?.aliases ??
      options.previous?.aliases ??
      Array.from(new Set([record.officialName, record.provisionalDesignation].filter(Boolean) as string[])),
    bodyType: "natural_satellite",
    parentId: getBodyIdFromName(record.parentName),
    systemId,
    orbitSource: options.curated?.orbitSource ?? options.previous?.orbitSource ?? ORBIT_SOURCE_REFERENCE,
    physicalSource:
      options.curated?.physicalSource ?? options.previous?.physicalSource ?? SATELLITE_PHYSICAL_SOURCE,
    shapeSource: options.curated?.shapeSource ?? options.previous?.shapeSource ?? SHAPE_SOURCE_REFERENCE,
    modelGrade: options.curated?.modelGrade ?? options.previous?.modelGrade ?? "B",
    descriptionOneLine:
      options.curated?.descriptionOneLine ?? options.previous?.descriptionOneLine ?? template.descriptionOneLine,
    descriptionShort:
      options.curated?.descriptionShort ?? options.previous?.descriptionShort ?? template.descriptionShort,
    descriptionMedium:
      options.curated?.descriptionMedium ?? options.previous?.descriptionMedium ?? template.descriptionMedium,
    descriptionLong: options.curated?.descriptionLong ?? options.previous?.descriptionLong,
    radiusKm: options.curated?.radiusKm ?? options.previous?.radiusKm ?? null,
    meanRadiusKm: options.curated?.meanRadiusKm ?? options.previous?.meanRadiusKm ?? null,
    triAxialRadiiKm: options.curated?.triAxialRadiiKm ?? options.previous?.triAxialRadiiKm ?? null,
    massKg: options.curated?.massKg ?? options.previous?.massKg ?? null,
    density: options.curated?.density ?? options.previous?.density ?? null,
    gravity: options.curated?.gravity ?? options.previous?.gravity ?? null,
    escapeVelocity: options.curated?.escapeVelocity ?? options.previous?.escapeVelocity ?? null,
    albedo: options.curated?.albedo ?? options.previous?.albedo ?? null,
    rotationPeriodHours:
      options.curated?.rotationPeriodHours ?? options.previous?.rotationPeriodHours ?? null,
    orbitalPeriodDays: options.curated?.orbitalPeriodDays ?? options.previous?.orbitalPeriodDays ?? null,
    semiMajorAxisKm: options.curated?.semiMajorAxisKm ?? options.previous?.semiMajorAxisKm ?? null,
    eccentricity: options.curated?.eccentricity ?? options.previous?.eccentricity ?? null,
    inclinationDeg: options.curated?.inclinationDeg ?? options.previous?.inclinationDeg ?? null,
    discoveryText:
      options.curated?.discoveryText ?? options.previous?.discoveryText ?? record.discoveryText ?? null,
    texturePath: options.curated?.texturePath ?? options.previous?.texturePath ?? null,
    modelPath: options.curated?.modelPath ?? options.previous?.modelPath ?? null,
    thumbnailPath: options.curated?.thumbnailPath ?? options.previous?.thumbnailPath ?? null,
    hasHighFidelityShape:
      options.curated?.hasHighFidelityShape ?? options.previous?.hasHighFidelityShape ?? false,
    featured: options.curated?.featured ?? options.previous?.featured ?? false,
    lastSyncedAt: options.lastSyncedAt,
    horizonsId: options.curated?.horizonsId ?? options.previous?.horizonsId ?? null,
    naifId: options.curated?.naifId ?? options.previous?.naifId ?? null,
    provisionalDesignation:
      options.curated?.provisionalDesignation ??
      options.previous?.provisionalDesignation ??
      record.provisionalDesignation,
    iauNumber: options.curated?.iauNumber ?? options.previous?.iauNumber ?? record.iauNumber,
    discoveryYear: options.curated?.discoveryYear ?? options.previous?.discoveryYear ?? record.discoveryYear,
    orbitDataKind: options.curated?.orbitDataKind ?? options.previous?.orbitDataKind ?? "mean_elements_reference",
    orbitAvailability:
      options.curated?.orbitAvailability ??
      options.previous?.orbitAvailability ??
      (options.curated?.horizonsId || options.previous?.horizonsId ? "reference_only" : "unresolved"),
    catalogStatus: options.curated?.catalogStatus ?? options.previous?.catalogStatus ?? "provisional",
    sources: {
      orbit: [SOURCE_URLS.horizons, SOURCE_URLS.satelliteOrbits],
      physical: [SOURCE_URLS.satellitePhysical],
      shape: options.curated?.sources?.shape ?? options.previous?.sources.shape ?? [],
      content:
        options.curated?.sources?.content ??
        options.previous?.sources.content ??
        [SOURCE_URLS.nasaSolarSystem],
    },
  } satisfies Body;
}

async function main() {
  const normalizedDir = path.join(process.cwd(), "data", "normalized");
  const rawDiscoveryPath = path.join(process.cwd(), "data", "raw", "jpl", "ssd", "discovery.html");

  logStep("Preparing normalized catalog snapshot from JPL SSD discovery data");

  const [previousBodies, previousSystems, curatedBodies, curatedSystems, orbitManifest] = await Promise.all([
    loadNormalizedBodiesSnapshot(),
    loadNormalizedSystemsSnapshot(),
    loadCuratedBodyOverrides(),
    loadCuratedSystemOverrides(),
    loadOrbitManifestSnapshot(),
  ]);

  const previousBodyById = new Map(previousBodies.map((body) => [body.id, body]));
  const curatedBodyById = new Map(curatedBodies.map((body) => [body.id, body]));
  const lastSyncedAt = new Date().toISOString();

  const discoveryHtml = await loadDiscoveryHtml(rawDiscoveryPath);
  let discoveryRecords: SatelliteDiscoveryRecord[] = [];

  if (discoveryHtml) {
    discoveryRecords = parseSatelliteDiscoveryPage(discoveryHtml);
  } else if (previousBodies.length > 0) {
    logWarning("No JPL discovery HTML available. Falling back to current normalized satellite snapshot.");
    discoveryRecords = previousBodies
      .filter((body) => body.bodyType === "natural_satellite" && body.id !== "moon")
      .map((body) => ({
        parentName: body.parentId ? (previousBodyById.get(body.parentId)?.officialName ?? body.parentId) : "Unknown",
        officialName: body.officialName,
        provisionalDesignation: body.provisionalDesignation,
        iauNumber: body.iauNumber,
        discoveryText: body.discoveryText ?? null,
        discoveryYear: body.discoveryYear,
        discovererText: null,
        referenceText: null,
      }));
  }

  if (discoveryRecords.length === 0) {
    throw new Error("Could not build catalog: no discovery records available from JPL SSD or local snapshot.");
  }

  const bodies = [
    ...PRIMARY_BODY_SEEDS.map((seed) =>
      createBaseBody(
        seed,
        previousBodyById.get(seed.id) ?? null,
        curatedBodyById.get(seed.id),
      ),
    ),
    ...discoveryRecords.map((record) => {
      const id = getBodyIdFromName(record.officialName);
      return createSatelliteBody(record, {
        previous: previousBodyById.get(id) ?? null,
        curated: curatedBodyById.get(id) ?? null,
        lastSyncedAt,
      });
    }),
  ]
    .filter((body, index, items) => items.findIndex((candidate) => candidate.id === body.id) === index)
    .sort((a, b) => a.englishName.localeCompare(b.englishName));

  const systems = buildSystemsFromBodies(bodies, previousSystems, curatedSystems, orbitManifest);

  if (await pathExists(path.join(normalizedDir, "bodies.json"))) {
    logWarning("Existing normalized catalog found. It will be replaced with the latest merged snapshot.");
  }

  await writeJsonFile(path.join(normalizedDir, "bodies.json"), bodies);
  await writeJsonFile(path.join(normalizedDir, "systems.json"), systems);

  logStep(`Wrote ${bodies.length} bodies and ${systems.length} systems from SSD discovery data`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] syncCatalog failed: ${String(error)}\n`);
  process.exit(1);
});
