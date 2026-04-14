/**
 * Builds offline orbit caches for visualization.
 *
 * Strategy:
 * - Try JPL Horizons vectors first for preset-covered bodies.
 * - Cache raw API responses under data/raw/jpl/horizons/.
 * - Fall back to existing cached vectors when online refresh fails.
 * - Fall back to reference orbit geometry only when no official cache exists.
 * - Rewrite normalized bodies/systems orbit coverage metadata from the manifest.
 */
import path from "node:path";

import { buildHorizonsLookupUrl, pickBestHorizonsLookupMatch } from "@/lib/adapters/horizons/lookup";
import {
  buildHorizonsVectorsUrl,
  parseHorizonsVectorsResult,
  type HorizonsVectorsResponse,
} from "@/lib/adapters/horizons/vectors";
import {
  getOrbitPresetConfig,
  getStepHoursForPresetBody,
  ORBIT_PRESET_CONFIGS,
} from "@/lib/orbits/presets";
import type { Body, OrbitManifestItem, OrbitPreset, OrbitSample } from "@/types";

import {
  applyOrbitCoverageToSystems,
  loadNormalizedBodiesSnapshot,
  loadNormalizedSystemsSnapshot,
  ORBIT_SOURCE_HORIZONS,
  ORBIT_SOURCE_REFERENCE,
} from "./catalog-pipeline";
import {
  fetchJson,
  logStep,
  logWarning,
  readJsonFile,
  writeJsonFile,
} from "./utils";

const HOURS_IN_DAY = 24;
const ORBIT_DIR = path.join(process.cwd(), "data", "generated", "orbits");
const MANIFEST_PATH = path.join(process.cwd(), "data", "generated", "orbit-manifest.json");
const RAW_LOOKUP_DIR = path.join(process.cwd(), "data", "raw", "jpl", "horizons", "lookup");
const RAW_VECTORS_DIR = path.join(process.cwd(), "data", "raw", "jpl", "horizons", "vectors");

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getReferenceDate() {
  const configured = process.env.SYNC_REFERENCE_DATE;
  if (configured) {
    const parsed = new Date(configured);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function getRangeForPreset(preset: OrbitPreset) {
  const config = getOrbitPresetConfig(preset);
  const referenceDate = getReferenceDate();
  const start = new Date(referenceDate.getTime() - config.windowDaysBefore * 24 * 60 * 60 * 1000);
  const stop = new Date(referenceDate.getTime() + config.windowDaysAfter * 24 * 60 * 60 * 1000);
  return { start, stop };
}

function formatStep(stepHours: number) {
  return `${stepHours} h`;
}

function getSampleFilePath(preset: OrbitPreset, bodyId: string) {
  return path.join(ORBIT_DIR, preset, `${bodyId}.json`);
}

function getLookupRawPath(bodyId: string) {
  return path.join(RAW_LOOKUP_DIR, `${bodyId}.json`);
}

function getVectorsRawPath(preset: OrbitPreset, bodyId: string) {
  return path.join(RAW_VECTORS_DIR, preset, `${bodyId}.json`);
}

function buildCenterCommand(centerBody: Body) {
  const code = centerBody.horizonsId ?? centerBody.naifId;
  if (!code) {
    throw new Error(`Center body ${centerBody.id} does not have a Horizons/NAIF identifier`);
  }

  return `500@${code}`;
}

function buildReferenceOrbitSample(
  body: Body,
  preset: OrbitPreset,
  centerBodyId: string,
  sampleStart: Date,
  sampleEnd: Date,
  stepHours: number,
): OrbitSample | null {
  if (!body.semiMajorAxisKm || !body.orbitalPeriodDays) {
    return null;
  }

  const inclination = toRadians(body.inclinationDeg ?? 0);
  const eccentricity = body.eccentricity ?? 0;
  const orbitalPeriodHours = body.orbitalPeriodDays * HOURS_IN_DAY;
  const totalSteps = Math.max(
    2,
    Math.floor((sampleEnd.getTime() - sampleStart.getTime()) / (stepHours * 60 * 60 * 1000)),
  );

  const points = Array.from({ length: totalSteps + 1 }, (_, index) => {
    const elapsedHours = index * stepHours;
    const angle = (elapsedHours / orbitalPeriodHours) * Math.PI * 2;
    const radius =
      body.semiMajorAxisKm! * ((1 - eccentricity ** 2) / (1 + eccentricity * Math.cos(angle)));
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle) * Math.sin(inclination);
    const z = radius * Math.sin(angle) * Math.cos(inclination);
    const t = new Date(sampleStart.getTime() + elapsedHours * 60 * 60 * 1000).toISOString();

    return {
      t,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
      vx: 0,
      vy: 0,
      vz: 0,
    };
  });

  return {
    bodyId: body.id,
    preset,
    source: ORBIT_SOURCE_REFERENCE,
    centerBodyId,
    frame: "reference-ecliptic",
    refPlane: "ECLIPTIC",
    refSystem: "ICRF",
    units: "KM-S",
    generatedAt: new Date().toISOString(),
    requestedRange: {
      start: sampleStart.toISOString(),
      stop: sampleEnd.toISOString(),
      step: formatStep(stepHours),
    },
    sampleStart: points[0]?.t ?? sampleStart.toISOString(),
    sampleEnd: points.at(-1)?.t ?? sampleEnd.toISOString(),
    stepHours,
    points,
    isReferenceOnly: true,
  };
}

async function resolveHorizonsId(body: Body) {
  if (body.horizonsId) {
    return body.horizonsId;
  }

  const lookupPath = getLookupRawPath(body.id);
  const searchTerms = [body.officialName, body.provisionalDesignation, body.iauNumber].filter(
    (value): value is string => Boolean(value),
  );

  for (const term of searchTerms) {
    try {
      const payload = await fetchJson<{
        count?: number | string;
        result?: Array<{
          name: string;
          type: string;
          pdes: string | null;
          spkid: string;
          alias: string[];
        }>;
      }>(buildHorizonsLookupUrl(term), Number(process.env.SYNC_TIMEOUT_MS ?? 30_000));
      await writeJsonFile(lookupPath, payload);
      const match = pickBestHorizonsLookupMatch(payload, {
        preferredName: body.officialName,
        preferredDesignation: body.provisionalDesignation,
      });
      if (match?.spkid) {
        return match.spkid;
      }
    } catch (error) {
      logWarning(`Horizons lookup failed for ${body.id} using "${term}": ${String(error)}`);
    }
  }

  const cached = await readJsonFile<{
    result?: Array<{
      name: string;
      type: string;
      pdes: string | null;
      spkid: string;
      alias: string[];
    }>;
  }>(lookupPath);
  const cachedMatch = cached
    ? pickBestHorizonsLookupMatch(cached, {
        preferredName: body.officialName,
        preferredDesignation: body.provisionalDesignation,
      })
    : null;

  return cachedMatch?.spkid ?? body.naifId ?? null;
}

async function loadCachedSample(preset: OrbitPreset, bodyId: string) {
  return readJsonFile<OrbitSample>(getSampleFilePath(preset, bodyId));
}

async function loadHorizonsSample(
  body: Body,
  preset: OrbitPreset,
  centerBody: Body,
  sampleStart: Date,
  sampleEnd: Date,
  stepHours: number,
) {
  const command = await resolveHorizonsId(body);
  if (!command) {
    return null;
  }

  const vectorsUrl = buildHorizonsVectorsUrl({
    command,
    center: buildCenterCommand(centerBody),
    startTime: sampleStart.toISOString(),
    stopTime: sampleEnd.toISOString(),
    stepSize: formatStep(stepHours),
  });
  const rawPath = getVectorsRawPath(preset, body.id);

  try {
    const payload = await fetchJson<HorizonsVectorsResponse>(
      vectorsUrl,
      Number(process.env.SYNC_TIMEOUT_MS ?? 30_000),
    );
    await writeJsonFile(rawPath, payload);

    if (!payload.result) {
      throw new Error("Horizons response did not contain a result payload");
    }

    return parseHorizonsVectorsResult(body.id, payload.result, {
      preset,
      source: ORBIT_SOURCE_HORIZONS,
      centerBodyId: centerBody.id,
      frame: "ICRF",
      refPlane: "ECLIPTIC",
      refSystem: "ICRF",
      units: "KM-S",
      generatedAt: new Date().toISOString(),
      requestedRange: {
        start: sampleStart.toISOString(),
        stop: sampleEnd.toISOString(),
        step: formatStep(stepHours),
      },
      stepHours,
    });
  } catch (error) {
    logWarning(`Horizons vectors failed for ${preset}/${body.id}: ${String(error)}`);
    const cachedRaw = await readJsonFile<HorizonsVectorsResponse>(rawPath);
    if (cachedRaw?.result) {
      logWarning(`Using cached Horizons vectors for ${preset}/${body.id}`);
      return parseHorizonsVectorsResult(body.id, cachedRaw.result, {
        preset,
        source: ORBIT_SOURCE_HORIZONS,
        centerBodyId: centerBody.id,
        frame: "ICRF",
        refPlane: "ECLIPTIC",
        refSystem: "ICRF",
        units: "KM-S",
        generatedAt: new Date().toISOString(),
        requestedRange: {
          start: sampleStart.toISOString(),
          stop: sampleEnd.toISOString(),
          step: formatStep(stepHours),
        },
        stepHours,
      });
    }

    return null;
  }
}

function getBodiesForPreset(preset: OrbitPreset, bodies: Body[]) {
  const config = getOrbitPresetConfig(preset);

  if (preset === "overview-current") {
    return config.bodyIds
      .map((id) => bodies.find((body) => body.id === id))
      .filter((body): body is Body => Boolean(body));
  }

  const systemId = `system-${config.centerBodyId}`;
  return bodies.filter((body) => body.systemId === systemId && body.bodyType === "natural_satellite");
}

function toManifestItem(sample: OrbitSample, body: Body): OrbitManifestItem {
  return {
    bodyId: body.id,
    preset: sample.preset,
    source: sample.source,
    centerBodyId: sample.centerBodyId,
    orbitDataKind: sample.isReferenceOnly ? "mean_elements_reference" : "horizons_sampled",
    orbitAvailability: sample.isReferenceOnly ? "reference_only" : "horizons_cached",
    generatedAt: sample.generatedAt,
    sampleStart: sample.sampleStart,
    sampleEnd: sample.sampleEnd,
    stepHours: sample.stepHours,
    frame: sample.frame,
    refPlane: sample.refPlane,
    refSystem: sample.refSystem,
    units: sample.units,
    isReferenceOnly: sample.isReferenceOnly,
  };
}

async function buildPresetSamples(
  preset: OrbitPreset,
  bodies: Body[],
  bodyById: Map<string, Body>,
) {
  const config = getOrbitPresetConfig(preset);
  const centerBody = bodyById.get(config.centerBodyId);
  if (!centerBody) {
    throw new Error(`Center body ${config.centerBodyId} was not found for preset ${preset}`);
  }

  const { start, stop } = getRangeForPreset(preset);
  const presetBodies = getBodiesForPreset(preset, bodies);
  const realBodyIds = new Set(config.bodyIds);
  const manifest: OrbitManifestItem[] = [];

  logStep(`Building orbit cache for preset ${preset} (${presetBodies.length} bodies)`);

  for (const body of presetBodies) {
    const stepHours = getStepHoursForPresetBody(preset, body.id);
    const filePath = getSampleFilePath(preset, body.id);
    let sample: OrbitSample | null = null;

    if (realBodyIds.has(body.id)) {
      sample = await loadHorizonsSample(body, preset, centerBody, start, stop, stepHours);
    }

    if (!sample) {
      const cached = await loadCachedSample(preset, body.id);
      if (cached) {
        sample = cached;
      }
    }

    if (!sample) {
      sample = buildReferenceOrbitSample(body, preset, centerBody.id, start, stop, stepHours);
    }

    if (!sample) {
      logWarning(`Skipping ${preset}/${body.id}: no Horizons cache and insufficient mean-element data for reference orbit.`);
      continue;
    }

    await writeJsonFile(filePath, sample);
    manifest.push(toManifestItem(sample, body));
  }

  return manifest;
}

function applyManifestToBodies(bodies: Body[], manifest: OrbitManifestItem[]) {
  const itemsByBodyId = new Map<string, OrbitManifestItem[]>();

  for (const item of manifest) {
    const list = itemsByBodyId.get(item.bodyId) ?? [];
    list.push(item);
    itemsByBodyId.set(item.bodyId, list);
  }

  return bodies.map((body) => {
    const items = itemsByBodyId.get(body.id) ?? [];
    const sampled = items.some((item) => !item.isReferenceOnly);
    const referenced = items.some((item) => item.isReferenceOnly);

    if (sampled) {
      return {
        ...body,
        orbitSource: ORBIT_SOURCE_HORIZONS,
        orbitDataKind: "horizons_sampled",
        orbitAvailability: "horizons_cached",
        lastSyncedAt: new Date().toISOString(),
      } satisfies Body;
    }

    if (referenced) {
      return {
        ...body,
        orbitSource: ORBIT_SOURCE_REFERENCE,
        orbitDataKind: body.bodyType === "star" ? "manual_reference" : "mean_elements_reference",
        orbitAvailability: "reference_only",
        lastSyncedAt: new Date().toISOString(),
      } satisfies Body;
    }

    return {
      ...body,
      orbitAvailability: body.horizonsId ? "reference_only" : "unresolved",
      lastSyncedAt: new Date().toISOString(),
    } satisfies Body;
  });
}

async function main() {
  const [bodies, systems] = await Promise.all([
    loadNormalizedBodiesSnapshot(),
    loadNormalizedSystemsSnapshot(),
  ]);

  if (bodies.length === 0) {
    throw new Error("No normalized bodies snapshot found. Run syncCatalog and syncPhysicalParams first.");
  }

  const bodyById = new Map(bodies.map((body) => [body.id, body]));
  const manifest = (
    await Promise.all(
      ORBIT_PRESET_CONFIGS.map((config) => buildPresetSamples(config.preset, bodies, bodyById)),
    )
  ).flat();

  await writeJsonFile(MANIFEST_PATH, manifest);

  const updatedBodies = applyManifestToBodies(bodies, manifest);
  const updatedSystems = applyOrbitCoverageToSystems(systems, manifest);

  await writeJsonFile(path.join(process.cwd(), "data", "normalized", "bodies.json"), updatedBodies);
  await writeJsonFile(path.join(process.cwd(), "data", "normalized", "systems.json"), updatedSystems);

  logStep(`Orbit cache build complete with ${manifest.length} manifest entries`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] buildOrbitSamples failed: ${String(error)}\n`);
  process.exit(1);
});
