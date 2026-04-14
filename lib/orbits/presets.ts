import type { Body, OrbitPreset } from "@/types";

export interface OrbitPresetConfig {
  preset: OrbitPreset;
  label: string;
  description: string;
  centerBodyId: string;
  bodyIds: string[];
  windowDaysBefore: number;
  windowDaysAfter: number;
  defaultStepHours: number;
  bodyStepHours?: Partial<Record<string, number>>;
}

export const ORBIT_PRESET_CONFIGS: OrbitPresetConfig[] = [
  {
    preset: "overview-current",
    label: "Solar System Overview",
    description: "Sun-centered Horizons vectors for the eight planets used on the solar-system overview page.",
    centerBodyId: "sun",
    bodyIds: ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"],
    windowDaysBefore: 730,
    windowDaysAfter: 730,
    defaultStepHours: 12,
    bodyStepHours: {
      mercury: 6,
      venus: 6,
      earth: 6,
      mars: 6,
    },
  },
  {
    preset: "earth-system-current",
    label: "Earth System",
    description: "Earth-centered Horizons vectors for the Moon.",
    centerBodyId: "earth",
    bodyIds: ["moon"],
    windowDaysBefore: 120,
    windowDaysAfter: 120,
    defaultStepHours: 1,
  },
  {
    preset: "mars-system-current",
    label: "Mars System",
    description: "Mars-centered Horizons vectors for Phobos and Deimos.",
    centerBodyId: "mars",
    bodyIds: ["phobos", "deimos"],
    windowDaysBefore: 120,
    windowDaysAfter: 120,
    defaultStepHours: 1,
  },
  {
    preset: "jupiter-system-current",
    label: "Jupiter System",
    description: "Jupiter-centered Horizons vectors for the Galilean moons.",
    centerBodyId: "jupiter",
    bodyIds: ["io", "europa", "ganymede", "callisto"],
    windowDaysBefore: 120,
    windowDaysAfter: 120,
    defaultStepHours: 2,
  },
  {
    preset: "saturn-system-current",
    label: "Saturn System",
    description: "Saturn-centered Horizons vectors for Titan and Enceladus.",
    centerBodyId: "saturn",
    bodyIds: ["titan", "enceladus"],
    windowDaysBefore: 180,
    windowDaysAfter: 180,
    defaultStepHours: 2,
  },
  {
    preset: "pluto-system-current",
    label: "Pluto System",
    description: "Pluto-centered Horizons vectors for the largest cached Pluto-system satellites.",
    centerBodyId: "pluto",
    bodyIds: ["charon", "nix", "hydra"],
    windowDaysBefore: 365 * 5,
    windowDaysAfter: 365 * 5,
    defaultStepHours: 6,
  },
];

export const orbitPresetMap = new Map(ORBIT_PRESET_CONFIGS.map((config) => [config.preset, config]));

const systemPresetBySlug: Partial<Record<string, OrbitPreset>> = {
  earth: "earth-system-current",
  mars: "mars-system-current",
  jupiter: "jupiter-system-current",
  saturn: "saturn-system-current",
  pluto: "pluto-system-current",
};

export function getOrbitPresetConfig(preset: OrbitPreset) {
  return orbitPresetMap.get(preset) ?? ORBIT_PRESET_CONFIGS[0]!;
}

export function getOrbitPresetForSystemSlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return systemPresetBySlug[slug] ?? null;
}

export function getPreferredOrbitPresetForBody(body: Pick<Body, "id" | "systemId">) {
  if (ORBIT_PRESET_CONFIGS[0]?.bodyIds.includes(body.id)) {
    return "overview-current" satisfies OrbitPreset;
  }

  return getOrbitPresetForSystemSlug(body.systemId?.replace("system-", "") ?? null);
}

export function getStepHoursForPresetBody(preset: OrbitPreset, bodyId: string) {
  const config = getOrbitPresetConfig(preset);
  return config.bodyStepHours?.[bodyId] ?? config.defaultStepHours;
}
