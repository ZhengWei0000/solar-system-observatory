import { describe, expect, it } from "vitest";

import { parseHorizonsVectorsResult } from "@/lib/adapters/horizons/vectors";
import { parseSatelliteDiscoveryPage } from "@/lib/adapters/jpl-ssd/parse-discovery";
import { parsePlanetPhysicalPage } from "@/lib/adapters/jpl-ssd/parse-planet-physical";
import { parseSatellitePhysicalPage } from "@/lib/adapters/jpl-ssd/parse-satellite-physical";

describe("JPL SSD adapters", () => {
  it("parses discovery table rows", () => {
    const html = `
      <table>
        <tr><th>IAU Number</th><th>Name</th><th>Designation</th><th>Year</th><th>Discoverer</th><th>Reference</th></tr>
        <tr><td>Satellites of Jupiter:</td></tr>
        <tr><td>XV</td><td>Adrastea</td><td>S/1979 J1</td><td>1979</td><td>D. Jewitt</td><td>IAUC 3872</td></tr>
      </table>
    `;

    const records = parseSatelliteDiscoveryPage(html);

    expect(records).toHaveLength(1);
    expect(records[0]?.parentName).toBe("Jupiter");
    expect(records[0]?.officialName).toBe("Adrastea");
    expect(records[0]?.provisionalDesignation).toBe("S/1979 J1");
    expect(records[0]?.discoveryYear).toBe(1979);
  });

  it("parses planet physical parameters", () => {
    const html = `
      <table>
        <tr>
          <th>Planet</th>
          <th>Equatorial radius (km)</th>
          <th>Mean radius (km)</th>
          <th>Mass x10^24 (kg)</th>
          <th>Density (g/cm^3)</th>
          <th>Rotation period (h)</th>
          <th>Orbital period (yr)</th>
          <th>V(1,0)</th>
          <th>Albedo</th>
          <th>Gravity (m/s^2)</th>
          <th>Escape velocity (km/s)</th>
        </tr>
        <tr>
          <td>Earth</td>
          <td>6378.1</td>
          <td>6371.0</td>
          <td>5.972</td>
          <td>5.514</td>
          <td>23.934</td>
          <td>1.000</td>
          <td>-3.86</td>
          <td>0.367</td>
          <td>9.80</td>
          <td>11.19</td>
        </tr>
      </table>
    `;

    const records = parsePlanetPhysicalPage(html);

    expect(records).toHaveLength(1);
    expect(records[0]?.englishName).toBe("Earth");
    expect(records[0]?.meanRadiusKm).toBe(6371);
    expect(records[0]?.massKg).toBeCloseTo(5.972e24);
    expect(records[0]?.orbitalPeriodDays).toBeCloseTo(365.256, 3);
  });

  it("parses satellite physical parameters", () => {
    const html = `
      <table>
        <tr>
          <th>Planet</th>
          <th>Satellite</th>
          <th>SPK-ID</th>
          <th>GM</th>
          <th>sigma</th>
          <th>GM ref.</th>
          <th>Radius (km)</th>
          <th>sigma</th>
          <th>Radius ref.</th>
          <th>Density</th>
          <th>sigma</th>
          <th>Density ref.</th>
        </tr>
        <tr>
          <td>Earth</td>
          <td>Moon</td>
          <td>301</td>
          <td>4902.800</td>
          <td>0.001</td>
          <td>DE440</td>
          <td>1737.4</td>
          <td>0.1</td>
          <td>1</td>
          <td>3.344</td>
          <td>0.001</td>
          <td>*</td>
        </tr>
      </table>
    `;

    const records = parseSatellitePhysicalPage(html);

    expect(records).toHaveLength(1);
    expect(records[0]?.officialName).toBe("Moon");
    expect(records[0]?.naifId).toBe("301");
    expect(records[0]?.meanRadiusKm).toBe(1737.4);
    expect(records[0]?.massKg).toBeGreaterThan(7e22);
  });
});

describe("Horizons adapter", () => {
  it("parses cached vector rows", () => {
    const raw = `
      target body name: Earth (399)
      $$SOE
      2461132.500000000, A.D. 2026-Apr-14 00:00:00.0000, 1.000000000, 2.000000000, 3.000000000, 0.100000000, 0.200000000, 0.300000000
      2461132.541666667, A.D. 2026-Apr-14 01:00:00.0000, 2.000000000, 4.000000000, 6.000000000, 0.200000000, 0.400000000, 0.600000000
      $$EOE
    `;

    const sample = parseHorizonsVectorsResult("earth", raw, {
      preset: "overview-current",
      source: "JPL Horizons",
      centerBodyId: "sun",
      frame: "ICRF",
      refPlane: "ECLIPTIC",
      refSystem: "ICRF",
      units: "KM-S",
      generatedAt: "2026-04-14T00:00:00.000Z",
      requestedRange: {
        start: "2026-04-14T00:00:00.000Z",
        stop: "2026-04-14T01:00:00.000Z",
        step: "1 h",
      },
      stepHours: 1,
    });

    expect(sample.isReferenceOnly).toBe(false);
    expect(sample.points).toHaveLength(2);
    expect(sample.points[0]?.x).toBe(1);
    expect(sample.points[1]?.vz).toBe(0.6);
  });
});
