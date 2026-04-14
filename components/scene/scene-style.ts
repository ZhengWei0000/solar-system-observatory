import type { Body, OrbitSamplePoint } from "@/types";

const colorMap: Record<string, string> = {
  sun: "#fbbf24",
  mercury: "#cbd5e1",
  venus: "#eab308",
  earth: "#38bdf8",
  moon: "#e2e8f0",
  mars: "#fb7185",
  phobos: "#c084fc",
  deimos: "#a78bfa",
  jupiter: "#fdba74",
  io: "#fbbf24",
  europa: "#bfdbfe",
  ganymede: "#d6d3d1",
  callisto: "#c4b5fd",
  saturn: "#fcd34d",
  titan: "#f59e0b",
  enceladus: "#cffafe",
  uranus: "#67e8f9",
  neptune: "#2563eb",
  triton: "#93c5fd",
  pluto: "#a8a29e",
  charon: "#cbd5e1",
};

export function getBodyColor(body: Pick<Body, "id" | "bodyType">) {
  if (colorMap[body.id]) {
    return colorMap[body.id];
  }

  if (body.bodyType === "natural_satellite") {
    return "#cbd5e1";
  }

  if (body.bodyType === "planet") {
    return "#93c5fd";
  }

  return "#f8fafc";
}

export function getOverviewDistance(body: Body, mode: "real" | "teaching") {
  if (!body.semiMajorAxisKm) {
    return 0;
  }

  if (mode === "real") {
    return body.semiMajorAxisKm / 60000000;
  }

  return Math.max(6, Math.log10(body.semiMajorAxisKm) * 9 - 62);
}

export function getOverviewRadius(body: Body, mode: "real" | "teaching") {
  if (body.id === "sun") {
    return mode === "real" ? 12 : 8;
  }

  const radius = body.meanRadiusKm ?? body.radiusKm ?? 600;

  if (mode === "real") {
    return Math.min(3.5, Math.max(0.2, radius / 8000));
  }

  return Math.min(2.8, Math.max(0.4, Math.log10(radius + 1) * 0.48));
}

export function getSystemDistance(body: Body, mode: "real" | "teaching") {
  if (!body.semiMajorAxisKm) {
    return 0;
  }

  if (mode === "real") {
    return body.semiMajorAxisKm / 65000;
  }

  return Math.max(3, Math.log10(body.semiMajorAxisKm) * 4.8 - 14);
}

export function getSystemRadius(body: Body, mode: "real" | "teaching") {
  const radius = body.meanRadiusKm ?? body.radiusKm ?? 40;

  if (mode === "real") {
    return Math.min(5.5, Math.max(0.22, radius / 650));
  }

  return Math.min(2.6, Math.max(0.28, Math.log10(radius + 1) * 0.45));
}

export function scaleOrbitPoints(points: OrbitSamplePoint[], scale: number) {
  return points.map((point) => [point.x / scale, point.y / scale, point.z / scale] as [number, number, number]);
}

function scalePointLinear(point: OrbitSamplePoint, scale: number) {
  return [point.x / scale, point.y / scale, point.z / scale] as [number, number, number];
}

function scalePointLogarithmic(
  point: OrbitSamplePoint,
  radiusMapper: (distanceKm: number) => number,
) {
  const distance = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
  if (distance === 0) {
    return [0, 0, 0] as [number, number, number];
  }

  const mappedRadius = radiusMapper(distance);
  const ratio = mappedRadius / distance;
  return [point.x * ratio, point.y * ratio, point.z * ratio] as [number, number, number];
}

export function scaleOverviewPoint(point: OrbitSamplePoint, mode: "real" | "teaching") {
  if (mode === "real") {
    return scalePointLinear(point, 60000000);
  }

  return scalePointLogarithmic(point, (distance) => Math.max(6, Math.log10(distance) * 9 - 62));
}

export function scaleSystemPoint(point: OrbitSamplePoint, mode: "real" | "teaching") {
  if (mode === "real") {
    return scalePointLinear(point, 65000);
  }

  return scalePointLogarithmic(point, (distance) => Math.max(3, Math.log10(distance) * 4.8 - 14));
}

export function scaleOverviewOrbitPoints(points: OrbitSamplePoint[], mode: "real" | "teaching") {
  return points.map((point) => scaleOverviewPoint(point, mode));
}

export function scaleSystemOrbitPoints(points: OrbitSamplePoint[], mode: "real" | "teaching") {
  return points.map((point) => scaleSystemPoint(point, mode));
}
