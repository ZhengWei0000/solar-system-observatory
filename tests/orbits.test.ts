import { describe, expect, it } from "vitest";

import { getPointForTimestamp } from "@/lib/orbits/interpolate";
import type { OrbitSample } from "@/types";

describe("orbit interpolation", () => {
  it("interpolates between cached points", () => {
    const sample: OrbitSample = {
      bodyId: "test",
      preset: "overview-current",
      source: "unit-test",
      centerBodyId: "sun",
      frame: "test",
      refPlane: "ECLIPTIC",
      refSystem: "ICRF",
      units: "KM-S",
      generatedAt: "2026-01-01T00:00:00.000Z",
      requestedRange: {
        start: "2026-01-01T00:00:00.000Z",
        stop: "2026-01-01T02:00:00.000Z",
        step: "1 h",
      },
      sampleStart: "2026-01-01T00:00:00.000Z",
      sampleEnd: "2026-01-01T02:00:00.000Z",
      stepHours: 1,
      isReferenceOnly: true,
      points: [
        { t: "2026-01-01T00:00:00.000Z", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
        { t: "2026-01-01T01:00:00.000Z", x: 10, y: 20, z: 30, vx: 1, vy: 2, vz: 3 },
        { t: "2026-01-01T02:00:00.000Z", x: 20, y: 40, z: 60, vx: 2, vy: 4, vz: 6 },
      ],
    };

    const point = getPointForTimestamp(sample, "2026-01-01T00:30:00.000Z");

    expect(point.x).toBe(5);
    expect(point.y).toBe(10);
    expect(point.z).toBe(15);
  });
});
