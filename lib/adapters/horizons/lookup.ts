export interface HorizonsLookupMatch {
  name: string;
  type: string;
  pdes: string | null;
  spkid: string;
  alias: string[];
}

export interface HorizonsLookupResponse {
  signature?: {
    source?: string;
    version?: string;
  };
  count?: number | string;
  result?: HorizonsLookupMatch[];
}

export function buildHorizonsLookupUrl(search: string) {
  const baseUrl =
    process.env.JPL_HORIZONS_LOOKUP_API_URL ??
    "https://ssd.jpl.nasa.gov/api/horizons_lookup.api";
  const url = new URL(baseUrl);
  url.searchParams.set("format", "json");
  url.searchParams.set("sstr", search);
  return url.toString();
}

export function pickBestHorizonsLookupMatch(
  payload: HorizonsLookupResponse,
  options: {
    preferredName?: string | null;
    preferredDesignation?: string | null;
  } = {},
) {
  const matches = payload.result ?? [];

  if (matches.length === 0) {
    return null;
  }

  const normalizedPreferredName = options.preferredName?.toLowerCase() ?? null;
  const normalizedPreferredDesignation = options.preferredDesignation?.toLowerCase() ?? null;

  const scored = matches
    .map((match) => {
      let score = 0;
      if (normalizedPreferredName && match.name.toLowerCase().includes(normalizedPreferredName)) score += 5;
      if (normalizedPreferredDesignation && match.pdes?.toLowerCase() === normalizedPreferredDesignation) score += 6;
      if (match.alias.some((alias) => alias.toLowerCase() === normalizedPreferredDesignation)) score += 4;
      if (/satellite|planet|pluto|major body/i.test(match.type)) score += 2;
      return { match, score };
    })
    .sort((a, b) => b.score - a.score || a.match.name.localeCompare(b.match.name));

  return scored[0]?.score && scored[0].score > 0 ? scored[0].match : matches[0] ?? null;
}
