import type { OrbitSample } from "@/types";

export interface HorizonsVectorsResponse {
  signature?: {
    source?: string;
    version?: string;
  };
  result?: string;
}

export function buildHorizonsVectorsUrl(params: {
  command: string;
  center: string;
  startTime: string;
  stopTime: string;
  stepSize: string;
}) {
  const baseUrl =
    process.env.JPL_HORIZONS_API_URL ??
    "https://ssd.jpl.nasa.gov/api/horizons.api";
  const url = new URL(baseUrl);
  url.searchParams.set("format", "json");
  url.searchParams.set("COMMAND", `'${params.command}'`);
  url.searchParams.set("OBJ_DATA", "YES");
  url.searchParams.set("MAKE_EPHEM", "YES");
  url.searchParams.set("EPHEM_TYPE", "VECTORS");
  url.searchParams.set("CENTER", `'${params.center}'`);
  url.searchParams.set("START_TIME", `'${params.startTime}'`);
  url.searchParams.set("STOP_TIME", `'${params.stopTime}'`);
  url.searchParams.set("STEP_SIZE", `'${params.stepSize}'`);
  url.searchParams.set("CSV_FORMAT", "YES");
  url.searchParams.set("VEC_TABLE", "2");
  url.searchParams.set("VEC_CORR", "NONE");
  url.searchParams.set("REF_PLANE", "ECLIPTIC");
  url.searchParams.set("REF_SYSTEM", "ICRF");
  url.searchParams.set("OUT_UNITS", "KM-S");
  url.searchParams.set("TIME_TYPE", "TDB");
  return url.toString();
}

function parseTimeFromColumns(columns: string[]) {
  const withCalendar = columns.find((column) => /\d{4}-[A-Za-z]{3}-\d{2}/.test(column));
  if (!withCalendar) {
    return null;
  }

  const normalized = withCalendar
    .replace(/^A\.D\.\s*/i, "")
    .replace(/^B\.C\.\s*/i, "")
    .replace(/\s+/g, " ");
  const parsed = new Date(normalized.replace(/-/g, " "));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseHorizonsVectorsResult(
  bodyId: string,
  rawResult: string,
  seed: Pick<
    OrbitSample,
    "preset" | "source" | "centerBodyId" | "frame" | "refPlane" | "refSystem" | "units" | "generatedAt" | "requestedRange" | "stepHours"
  >,
) {
  const startMarker = rawResult.indexOf("$$SOE");
  const endMarker = rawResult.indexOf("$$EOE");

  if (startMarker === -1 || endMarker === -1 || endMarker <= startMarker) {
    throw new Error("Horizons response did not contain $$SOE/$$EOE markers");
  }

  const lines = rawResult
    .slice(startMarker + 5, endMarker)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const points = lines.flatMap((line) => {
    const columns = line.split(",").map((value) => value.trim()).filter(Boolean);
    const numericColumns = columns
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numericColumns.length < 6) {
      return [];
    }

    const timestamp = parseTimeFromColumns(columns) ?? null;
    if (!timestamp) {
      return [];
    }

    const tail = numericColumns.slice(-6);
    if (tail.length < 6) {
      return [];
    }
    const x = tail[0]!;
    const y = tail[1]!;
    const z = tail[2]!;
    const vx = tail[3]!;
    const vy = tail[4]!;
    const vz = tail[5]!;
    return [{ t: timestamp, x, y, z, vx, vy, vz }];
  });

  if (points.length === 0) {
    throw new Error("Horizons vector payload contained no parseable state vectors");
  }

  return {
    bodyId,
    preset: seed.preset,
    source: seed.source,
    centerBodyId: seed.centerBodyId,
    frame: seed.frame,
    refPlane: seed.refPlane,
    refSystem: seed.refSystem,
    units: seed.units,
    generatedAt: seed.generatedAt,
    requestedRange: seed.requestedRange,
    sampleStart: points[0]?.t ?? seed.requestedRange.start,
    sampleEnd: points.at(-1)?.t ?? seed.requestedRange.stop,
    stepHours: seed.stepHours,
    points,
    isReferenceOnly: false,
  } satisfies OrbitSample;
}
