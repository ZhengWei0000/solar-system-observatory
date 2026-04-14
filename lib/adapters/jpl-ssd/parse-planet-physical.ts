import type { PlanetPhysicalRecord } from "./types";

import { extractTables, extractVisibleLines, normalizeHeader, parseMaybeNumber } from "./parse-utils";

const PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const ORBITAL_YEAR_TO_DAY = 365.256;

function toMassKg(valueIn10e24Kg: number | null) {
  return valueIn10e24Kg === null ? null : valueIn10e24Kg * 1e24;
}

function parseTables(html: string) {
  const tables = extractTables(html);
  const records: PlanetPhysicalRecord[] = [];

  for (const rows of tables) {
    const header = rows[0]?.map(normalizeHeader) ?? [];
    if (!header.some((cell) => cell.includes("planet")) || !header.some((cell) => cell.includes("mass"))) {
      continue;
    }

    for (const row of rows.slice(1)) {
      if (row.length < 10) {
        continue;
      }

      const englishName = row[0] ?? "";
      if (!PLANET_NAMES.includes(englishName)) {
        continue;
      }

      const equatorialRadiusKm = parseMaybeNumber(row[1]);
      const meanRadiusKm = parseMaybeNumber(row[2]);
      const massKg = toMassKg(parseMaybeNumber(row[3]));
      const density = parseMaybeNumber(row[4]);
      const rotationPeriodHours = parseMaybeNumber(row[5]);
      const orbitalPeriodDays =
        parseMaybeNumber(row[6]) === null ? null : (parseMaybeNumber(row[6]) ?? 0) * ORBITAL_YEAR_TO_DAY;
      const albedo = parseMaybeNumber(row[8]);
      const gravity = parseMaybeNumber(row[9]);
      const escapeVelocity = parseMaybeNumber(row[10]);

      records.push({
        englishName,
        equatorialRadiusKm,
        meanRadiusKm,
        massKg,
        density,
        rotationPeriodHours,
        orbitalPeriodDays,
        albedo,
        gravity,
        escapeVelocity,
      });
    }
  }

  return records;
}

export function parsePlanetPhysicalPage(html: string) {
  const tableRecords = parseTables(html);
  if (tableRecords.length > 0) {
    return tableRecords;
  }

  const lines = extractVisibleLines(html);
  const records: PlanetPhysicalRecord[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const englishName = PLANET_NAMES.find((name) => lines[index]?.startsWith(name));
    if (!englishName) {
      continue;
    }

    const block = lines.slice(index, index + 11);
    const numbers = block.map((line) => parseMaybeNumber(line)).filter((value) => value !== null);

    if (numbers.length < 8) {
      continue;
    }

    records.push({
      englishName,
      equatorialRadiusKm: numbers[0] ?? null,
      meanRadiusKm: numbers[1] ?? null,
      massKg: toMassKg(numbers[2] ?? null),
      density: numbers[3] ?? null,
      rotationPeriodHours: numbers[4] ?? null,
      orbitalPeriodDays: numbers[5] === null ? null : (numbers[5] ?? 0) * ORBITAL_YEAR_TO_DAY,
      albedo: numbers[7] ?? null,
      gravity: numbers[8] ?? null,
      escapeVelocity: numbers[9] ?? null,
    });
  }

  return records;
}
