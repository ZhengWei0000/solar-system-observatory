import { load } from "cheerio";

function cleanValue(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[∗*†‡]+/g, "")
    .trim();
}

export function normalizeHeader(value: string) {
  return cleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function parseMaybeNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/,/g, "")
    .replace(/×/g, "x")
    .replace(/\s+/g, "")
    .replace(/[^\d.eE+\-x]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "n/a") {
    return null;
  }

  if (cleaned.includes("x10")) {
    const [base, exponent] = cleaned.split("x10");
    const parsedBase = Number(base);
    const parsedExponent = Number(exponent);

    if (Number.isFinite(parsedBase) && Number.isFinite(parsedExponent)) {
      return parsedBase * 10 ** parsedExponent;
    }
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractTables(html: string) {
  const $ = load(html);
  const tables: string[][][] = [];

  $("table").each((_, table) => {
    const rows: string[][] = [];

    $(table)
      .find("tr")
      .each((__, row) => {
        const cells = $(row)
          .find("th,td")
          .toArray()
          .map((cell) => cleanValue($(cell).text()))
          .filter(Boolean);

        if (cells.length > 0) {
          rows.push(cells);
        }
      });

    if (rows.length > 0) {
      tables.push(rows);
    }
  });

  return tables;
}

export function extractVisibleLines(html: string) {
  const $ = load(html);
  return $("body")
    .text()
    .split(/\r?\n/)
    .map((line) => cleanValue(line))
    .filter(Boolean);
}
