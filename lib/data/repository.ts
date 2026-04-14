import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getPointForTimestamp } from "@/lib/orbits/interpolate";
import { getPreferredOrbitPresetForBody } from "@/lib/orbits/presets";
import type {
  Body,
  OrbitManifestItem,
  OrbitPreset,
  OrbitSample,
  PlanetSystem,
  SearchIndexItem,
} from "@/types";

import {
  bodiesSchema,
  orbitManifestSchema,
  orbitSampleSchema,
  searchIndexSchema,
  systemsSchema,
} from "./schemas";

const normalizedDir = path.join(process.cwd(), "data", "normalized");
const generatedDir = path.join(process.cwd(), "data", "generated");
const orbitDir = path.join(generatedDir, "orbits");

async function readJson<T>(filePath: string, parser: { parse: (value: unknown) => T }) {
  const raw = await fs.readFile(filePath, "utf8");
  return parser.parse(JSON.parse(raw));
}

export const getBodies = cache(async (): Promise<Body[]> =>
  readJson(path.join(normalizedDir, "bodies.json"), bodiesSchema),
);

export const getSystems = cache(async (): Promise<PlanetSystem[]> =>
  readJson(path.join(normalizedDir, "systems.json"), systemsSchema),
);

export const getSearchIndex = cache(async (): Promise<SearchIndexItem[]> =>
  readJson(path.join(generatedDir, "search-index.json"), searchIndexSchema),
);

export const getOrbitManifest = cache(async (): Promise<OrbitManifestItem[]> => {
  try {
    return await readJson(path.join(generatedDir, "orbit-manifest.json"), orbitManifestSchema);
  } catch {
    return [];
  }
});

export async function getBodyBySlug(slug: string) {
  const bodies = await getBodies();
  return bodies.find((body) => body.slug === slug) ?? null;
}

export async function getBodyById(id: string) {
  const bodies = await getBodies();
  return bodies.find((body) => body.id === id) ?? null;
}

export async function getSystemBySlug(slug: string) {
  const systems = await getSystems();
  const system = systems.find((candidate) => candidate.slug === slug) ?? null;

  if (!system) {
    return null;
  }

  const bodies = await getBodies();
  const members = bodies.filter((body) => body.systemId === system.id || body.id === system.primaryBodyId);

  return {
    system,
    members,
    primary:
      members.find((member) => member.id === system.primaryBodyId) ??
      (await getBodyById(system.primaryBodyId)),
  };
}

export async function getFeaturedBodies(limit = 12) {
  const bodies = await getBodies();
  return bodies.filter((body) => body.featured).slice(0, limit);
}

export async function getBodiesBySystemId(systemId: string) {
  const bodies = await getBodies();
  return bodies.filter((body) => body.systemId === systemId || body.id === systemId);
}

export async function searchBodies(query: string, limit = 12) {
  const q = query.trim().toLowerCase();

  if (!q) {
    return [];
  }

  const index = await getSearchIndex();

  return index
    .map((item) => ({
      item,
      score: scoreSearchItem(item, q),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .slice(0, limit)
    .map((entry) => entry.item);
}

function scoreSearchItem(item: SearchIndexItem, q: string) {
  let score = 0;

  if (item.names.some((name) => name.toLowerCase() === q)) score += 80;
  if (item.aliases.some((alias) => alias.toLowerCase() === q)) score += 60;
  if (item.names.some((name) => name.toLowerCase().includes(q))) score += 30;
  if (item.aliases.some((alias) => alias.toLowerCase().includes(q))) score += 24;
  if (item.systemNames.some((name) => name.toLowerCase().includes(q))) score += 12;
  if (item.tokens.some((token) => token.includes(q))) score += 8;
  if (item.modelGrade === "S") score += 2;
  if (item.modelGrade === "A") score += 1;

  return score;
}

export async function getRelatedBodies(body: Body, limit = 6) {
  const bodies = await getBodies();

  return bodies
    .filter((candidate) => {
      if (candidate.id === body.id) return false;
      if (body.systemId && candidate.systemId === body.systemId) return true;
      if (candidate.featured && candidate.bodyType === body.bodyType) return true;
      return false;
    })
    .slice(0, limit);
}

function getOrbitSamplePath(preset: OrbitPreset, bodyId: string) {
  return path.join(orbitDir, preset, `${bodyId}.json`);
}

async function readOrbitSampleFromPath(filePath: string): Promise<OrbitSample | null> {
  try {
    return await readJson(filePath, orbitSampleSchema);
  } catch {
    return null;
  }
}

function pickManifestItem(
  body: Body,
  manifestItems: OrbitManifestItem[],
  preset?: OrbitPreset | "auto" | null,
) {
  if (manifestItems.length === 0) {
    return null;
  }

  if (preset && preset !== "auto") {
    return manifestItems.find((item) => item.preset === preset) ?? null;
  }

  const preferredPreset = getPreferredOrbitPresetForBody(body);
  const exactPreferred = preferredPreset
    ? manifestItems.find((item) => item.preset === preferredPreset && !item.isReferenceOnly)
    : null;
  if (exactPreferred) {
    return exactPreferred;
  }

  const anySampled = manifestItems.find((item) => !item.isReferenceOnly);
  if (anySampled) {
    return anySampled;
  }

  if (preferredPreset) {
    const preferredReference = manifestItems.find((item) => item.preset === preferredPreset);
    if (preferredReference) {
      return preferredReference;
    }
  }

  return manifestItems[0] ?? null;
}

export async function getOrbitSample(
  bodyId: string,
  preset?: OrbitPreset | "auto" | null,
): Promise<OrbitSample | null> {
  const body = await getBodyById(bodyId);
  if (!body) {
    return null;
  }

  const manifest = await getOrbitManifest();
  const items = manifest.filter((item) => item.bodyId === bodyId);
  const selected = pickManifestItem(body, items, preset);

  if (!selected) {
    return null;
  }

  return readOrbitSampleFromPath(getOrbitSamplePath(selected.preset, bodyId));
}

export async function getBestOrbitSample(
  bodyId: string,
  preset?: OrbitPreset | "auto" | null,
) {
  const body = await getBodyById(bodyId);
  if (!body) {
    return null;
  }

  const manifest = await getOrbitManifest();
  const selected = pickManifestItem(
    body,
    manifest.filter((item) => item.bodyId === bodyId),
    preset,
  );

  if (!selected) {
    return null;
  }

  const sample = await readOrbitSampleFromPath(getOrbitSamplePath(selected.preset, bodyId));
  if (!sample) {
    return null;
  }

  return { manifest: selected, sample };
}

export async function getBodyPositionAt(
  bodyId: string,
  preset: OrbitPreset | "auto",
  timestamp: string,
) {
  const payload = await getBestOrbitSample(bodyId, preset);
  if (!payload) {
    return null;
  }

  return getPointForTimestamp(payload.sample, timestamp);
}

export async function getOrbitResponse(
  bodyId: string,
  preset: OrbitPreset | "auto" = "auto",
) {
  const body = await getBodyById(bodyId);

  if (!body) {
    return {
      status: "missing" as const,
      source: "body_not_found",
      orbitDataKind: "manual_reference" as const,
      orbitAvailability: "unresolved" as const,
      preset: null,
      centerBodyId: null,
      coverage: null,
      points: [],
    };
  }

  const payload = await getBestOrbitSample(bodyId, preset);

  if (!payload) {
    return {
      status: "missing" as const,
      source: body.orbitSource,
      orbitDataKind: body.orbitDataKind,
      orbitAvailability: body.orbitAvailability,
      preset: preset === "auto" ? getPreferredOrbitPresetForBody(body) : preset,
      centerBodyId: body.parentId,
      coverage: null,
      points: [],
    };
  }

  const { manifest, sample } = payload;

  return {
    status: "ok" as const,
    source: sample.source,
    orbitDataKind: manifest.orbitDataKind,
    orbitAvailability: manifest.orbitAvailability,
    preset: manifest.preset,
    centerBodyId: manifest.centerBodyId,
    coverage: {
      sampleStart: sample.sampleStart,
      sampleEnd: sample.sampleEnd,
      stepHours: sample.stepHours,
      frame: sample.frame,
      refPlane: sample.refPlane,
      refSystem: sample.refSystem,
      units: sample.units,
      generatedAt: sample.generatedAt,
      isReferenceOnly: sample.isReferenceOnly,
    },
    points: sample.points,
  };
}
