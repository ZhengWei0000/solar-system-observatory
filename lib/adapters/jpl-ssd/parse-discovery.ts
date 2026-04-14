import type { SatelliteDiscoveryRecord } from "./types";

import { extractTables, extractVisibleLines, normalizeHeader } from "./parse-utils";

function parseDiscoveryLine(line: string, parentName: string): SatelliteDiscoveryRecord | null {
  const tokens = line.split(/\s+/);

  if (tokens.length < 3) {
    return null;
  }

  let cursor = 0;
  let iauNumber: string | null = null;

  if (/^[IVXLCDM]+$/i.test(tokens[cursor] ?? "")) {
    iauNumber = tokens[cursor] ?? null;
    cursor += 1;
  }

  const yearStart = tokens.findIndex((token, index) => index >= cursor && /^\d{4},?$/.test(token));

  if (yearStart === -1) {
    return null;
  }

  let yearEnd = yearStart;
  while (yearEnd + 1 < tokens.length && /^\d{4},?$/.test(tokens[yearEnd + 1] ?? "")) {
    yearEnd += 1;
  }

  let referenceStart = tokens.length;
  for (let index = tokens.length - 1; index >= yearEnd + 1; index -= 1) {
    if (/^(IAUC|MPEC|CBET|IAU)$/i.test(tokens[index] ?? "")) {
      referenceStart = index;
      break;
    }
  }

  const prefixTokens = tokens.slice(cursor, yearStart);
  const provisionalIndex = prefixTokens.findIndex((token) => /^S\/\d{4}$/i.test(token));
  const officialName =
    provisionalIndex === -1
      ? prefixTokens.join(" ")
      : prefixTokens.slice(0, provisionalIndex).join(" ") || prefixTokens.join(" ");
  const provisionalDesignation =
    provisionalIndex === -1 ? null : prefixTokens.slice(provisionalIndex).join(" ");
  const yearText = tokens.slice(yearStart, yearEnd + 1).join(" ");
  const discoveryYear = Number.parseInt(tokens[yearStart] ?? "", 10);
  const discovererText =
    referenceStart > yearEnd + 1 ? tokens.slice(yearEnd + 1, referenceStart).join(" ") : null;
  const referenceText = referenceStart < tokens.length ? tokens.slice(referenceStart).join(" ") : null;

  if (!officialName) {
    return null;
  }

  return {
    parentName,
    officialName,
    provisionalDesignation,
    iauNumber,
    discoveryText: `${yearText}${discovererText ? ` · ${discovererText}` : ""}${referenceText ? ` · ${referenceText}` : ""}`,
    discoveryYear: Number.isFinite(discoveryYear) ? discoveryYear : null,
    discovererText,
    referenceText,
  };
}

function parseTables(html: string) {
  const tables = extractTables(html);
  const records: SatelliteDiscoveryRecord[] = [];

  for (const rows of tables) {
    const header = rows[0]?.map(normalizeHeader) ?? [];
    if (!header.some((cell) => cell.includes("iau")) || !header.some((cell) => cell.includes("year"))) {
      continue;
    }

    let parentName = "";
    for (const row of rows.slice(1)) {
      if (row.length === 1 && /satellites of/i.test(row[0] ?? "")) {
        const match = row[0]?.match(/Satellites of (?:Dwarf Planet )?([^:]+):/i);
        if (match?.[1]) {
          parentName = match[1].trim();
        }
        continue;
      }

      if (!parentName || row.length < 4) {
        continue;
      }

      const [iauNumber, officialName, provisionalDesignation, discoveryYear, ...rest] = row;
      if (!officialName) {
        continue;
      }
      records.push({
        parentName,
        officialName,
        provisionalDesignation: provisionalDesignation && provisionalDesignation !== "-" ? provisionalDesignation : null,
        iauNumber: iauNumber && iauNumber !== "-" ? iauNumber : null,
        discoveryText: [discoveryYear, ...rest].filter(Boolean).join(" · ") || null,
        discoveryYear: Number.parseInt(discoveryYear ?? "", 10) || null,
        discovererText: rest.slice(0, Math.max(0, rest.length - 1)).join(" ") || null,
        referenceText: rest.at(-1) ?? null,
      });
    }
  }

  return records;
}

export function parseSatelliteDiscoveryPage(html: string) {
  const tableRecords = parseTables(html);

  if (tableRecords.length > 0) {
    return dedupeDiscoveryRecords(tableRecords);
  }

  const lines = extractVisibleLines(html);
  const records: SatelliteDiscoveryRecord[] = [];
  let parentName = "";

  for (const line of lines) {
    const sectionMatch = line.match(/^Satellites of (?:Dwarf Planet )?([^:]+):/i);
    if (sectionMatch?.[1]) {
      parentName = sectionMatch[1].trim();
      continue;
    }

    if (!parentName) {
      continue;
    }

    const record = parseDiscoveryLine(line, parentName);
    if (record) {
      records.push(record);
    }
  }

  return dedupeDiscoveryRecords(records);
}

function dedupeDiscoveryRecords(records: SatelliteDiscoveryRecord[]) {
  return Array.from(
    new Map(records.map((record) => [`${record.parentName}:${record.officialName}`, record])).values(),
  );
}
