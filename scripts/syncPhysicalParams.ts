import path from "node:path";

import { parsePlanetPhysicalPage } from "@/lib/adapters/jpl-ssd/parse-planet-physical";
import { parseSatellitePhysicalPage } from "@/lib/adapters/jpl-ssd/parse-satellite-physical";
import type { Body } from "@/types";

import {
  loadCuratedBodyOverrides,
  loadNormalizedBodiesSnapshot,
  PLANET_PHYSICAL_SOURCE,
  SATELLITE_PHYSICAL_SOURCE,
  SOURCE_URLS,
} from "./catalog-pipeline";
import { fetchText, logStep, logWarning, readTextFile, writeJsonFile, writeTextFile } from "./utils";

function buildPlanetPhysicalUrl() {
  const baseUrl = process.env.JPL_SSD_BASE_URL ?? "https://ssd.jpl.nasa.gov";
  return new URL("/planets/phys_par.html", baseUrl).toString();
}

function buildSatellitePhysicalUrl() {
  const baseUrl = process.env.JPL_SSD_BASE_URL ?? "https://ssd.jpl.nasa.gov";
  return new URL("/sats/phys_par/", baseUrl).toString();
}

async function loadPage(rawPath: string, url: string) {
  try {
    const html = await fetchText(url, Number(process.env.SYNC_TIMEOUT_MS ?? 30_000));
    await writeTextFile(rawPath, html);
    return html;
  } catch (error) {
    logWarning(`Failed to refresh ${url}: ${String(error)}`);
    const cached = await readTextFile(rawPath);
    if (cached) {
      logWarning(`Falling back to cached raw snapshot for ${url}`);
      return cached;
    }
    return null;
  }
}

async function main() {
  const bodiesPath = path.join(process.cwd(), "data", "normalized", "bodies.json");
  const planetsRawPath = path.join(process.cwd(), "data", "raw", "jpl", "ssd", "planets-physical.html");
  const satellitesRawPath = path.join(process.cwd(), "data", "raw", "jpl", "ssd", "satellites-physical.html");

  logStep("Refreshing physical parameters from JPL SSD");

  const [existingBodies, curatedBodies, planetsHtml, satellitesHtml] = await Promise.all([
    loadNormalizedBodiesSnapshot(),
    loadCuratedBodyOverrides(),
    loadPage(planetsRawPath, buildPlanetPhysicalUrl()),
    loadPage(satellitesRawPath, buildSatellitePhysicalUrl()),
  ]);

  if (existingBodies.length === 0) {
    throw new Error("No normalized bodies snapshot found. Run syncCatalog before syncPhysicalParams.");
  }

  const curatedBodyById = new Map(curatedBodies.map((body) => [body.id, body]));
  const planetRecords = planetsHtml ? parsePlanetPhysicalPage(planetsHtml) : [];
  const satelliteRecords = satellitesHtml ? parseSatellitePhysicalPage(satellitesHtml) : [];

  if (planetRecords.length === 0) {
    logWarning("Planet physical parameters were not refreshed. Existing planet physical values will be preserved.");
  }

  if (satelliteRecords.length === 0) {
    logWarning("Satellite physical parameters were not refreshed. Existing moon physical values will be preserved.");
  }

  const planetByEnglishName = new Map(planetRecords.map((record) => [record.englishName.toLowerCase(), record]));
  const satelliteByKey = new Map(
    satelliteRecords.map((record) => [`${record.parentName}:${record.officialName}`.toLowerCase(), record]),
  );
  const bodyById = new Map(existingBodies.map((body) => [body.id, body]));

  const merged = existingBodies.map((body) => {
    const curated = curatedBodyById.get(body.id);
    const planetRecord = planetByEnglishName.get(body.englishName.toLowerCase());
    const parentOfficialName = body.parentId ? bodyById.get(body.parentId)?.officialName ?? null : null;
    const satelliteRecord = parentOfficialName
      ? satelliteByKey.get(`${parentOfficialName}:${body.officialName}`.toLowerCase())
      : null;

    const physicalRecord = planetRecord ?? satelliteRecord;
    if (!physicalRecord) {
      return {
        ...body,
        lastSyncedAt: new Date().toISOString(),
      } satisfies Body;
    }

    return {
      ...body,
      radiusKm:
        curated?.radiusKm ??
        ("equatorialRadiusKm" in physicalRecord ? physicalRecord.equatorialRadiusKm : body.radiusKm) ??
        physicalRecord.meanRadiusKm ??
        body.radiusKm,
      meanRadiusKm: curated?.meanRadiusKm ?? physicalRecord.meanRadiusKm ?? body.meanRadiusKm,
      massKg: curated?.massKg ?? physicalRecord.massKg ?? body.massKg,
      density: curated?.density ?? physicalRecord.density ?? body.density,
      gravity:
        curated?.gravity ??
        ("gravity" in physicalRecord ? physicalRecord.gravity : body.gravity) ??
        body.gravity,
      escapeVelocity:
        curated?.escapeVelocity ??
        ("escapeVelocity" in physicalRecord ? physicalRecord.escapeVelocity : body.escapeVelocity) ??
        body.escapeVelocity,
      albedo:
        curated?.albedo ??
        ("albedo" in physicalRecord ? physicalRecord.albedo : body.albedo) ??
        body.albedo,
      rotationPeriodHours:
        curated?.rotationPeriodHours ??
        ("rotationPeriodHours" in physicalRecord ? physicalRecord.rotationPeriodHours : body.rotationPeriodHours) ??
        body.rotationPeriodHours,
      orbitalPeriodDays:
        curated?.orbitalPeriodDays ??
        ("orbitalPeriodDays" in physicalRecord ? physicalRecord.orbitalPeriodDays : body.orbitalPeriodDays) ??
        body.orbitalPeriodDays,
      naifId: curated?.naifId ?? ("naifId" in physicalRecord ? physicalRecord.naifId : body.naifId) ?? body.naifId,
      physicalSource:
        body.bodyType === "natural_satellite" ? SATELLITE_PHYSICAL_SOURCE : PLANET_PHYSICAL_SOURCE,
      catalogStatus: "confirmed",
      lastSyncedAt: new Date().toISOString(),
      sources: {
        ...body.sources,
        physical: [body.bodyType === "natural_satellite" ? SOURCE_URLS.satellitePhysical : SOURCE_URLS.planetPhysical],
      },
    } satisfies Body;
  });

  await writeJsonFile(bodiesPath, merged);
  logStep(`Updated physical fields for ${merged.length} bodies from JPL SSD`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] syncPhysicalParams failed: ${String(error)}\n`);
  process.exit(1);
});
