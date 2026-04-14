import type { SatellitePhysicalRecord } from "./types";

import { extractTables, extractVisibleLines, normalizeHeader, parseMaybeNumber } from "./parse-utils";

const GRAVITATIONAL_CONSTANT_KM3_KG_S2 = 6.6743e-20;
const PARENT_NAMES = ["Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function toMassKg(gmKm3s2: number | null) {
  return gmKm3s2 === null ? null : gmKm3s2 / GRAVITATIONAL_CONSTANT_KM3_KG_S2;
}

function parseTables(html: string) {
  const tables = extractTables(html);
  const records: SatellitePhysicalRecord[] = [];

  for (const rows of tables) {
    const header = rows[0]?.map(normalizeHeader) ?? [];
    if (!header.some((cell) => cell.includes("planet")) || !header.some((cell) => cell.includes("satellite"))) {
      continue;
    }

    for (const row of rows.slice(1)) {
      if (row.length < 7) {
        continue;
      }

      const parentName = row[0] ?? "";
      const officialName = row[1] ?? "";
      if (!PARENT_NAMES.includes(parentName) || !officialName) {
        continue;
      }

      const gmKm3s2 = parseMaybeNumber(row[3]);
      const meanRadiusKm = parseMaybeNumber(row[6]);
      const density = parseMaybeNumber(row[9]);

      records.push({
        parentName,
        officialName,
        naifId: row[2] ?? null,
        gmKm3s2,
        meanRadiusKm,
        density,
        massKg: toMassKg(gmKm3s2),
      });
    }
  }

  return records;
}

export function parseSatellitePhysicalPage(html: string) {
  const tableRecords = parseTables(html);
  if (tableRecords.length > 0) {
    return dedupeSatelliteRecords(tableRecords);
  }

  const lines = extractVisibleLines(html);
  const records: SatellitePhysicalRecord[] = [];

  for (const line of lines) {
    const tokens = line.split(/\s+/);
    const parentName = tokens[0] ?? "";

    if (!PARENT_NAMES.includes(parentName)) {
      continue;
    }

    const naifIndex = tokens.findIndex((token, index) => index > 0 && /^\d+$/.test(token));
    if (naifIndex <= 1) {
      continue;
    }

    const officialName = tokens.slice(1, naifIndex).join(" ");
    const gmKm3s2 = parseMaybeNumber(tokens[naifIndex + 1]);
    const meanRadiusKm = parseMaybeNumber(tokens[naifIndex + 4]);
    const density = parseMaybeNumber(tokens[naifIndex + 7]);

    records.push({
      parentName,
      officialName,
      naifId: tokens[naifIndex] ?? null,
      gmKm3s2,
      meanRadiusKm,
      density,
      massKg: toMassKg(gmKm3s2),
    });
  }

  return dedupeSatelliteRecords(records);
}

function dedupeSatelliteRecords(records: SatellitePhysicalRecord[]) {
  return Array.from(
    new Map(records.map((record) => [`${record.parentName}:${record.officialName}`, record])).values(),
  );
}
