import { env, hasRapidApi } from "@/lib/env";
import { MOCK_TITLES } from "@/lib/mockData";
import { platformDisplayName } from "@/lib/genreMap";
import type { OttLink } from "@/lib/types";

export interface TitleDetails {
  imdbRating: number | null;
  runtime: number | null; // minutes
  ottLinks: OttLink[];
}

interface RapidApiStreamingEntry {
  platform: string;
  url: string;
}

interface RapidApiTitleDetailsResponse {
  imdbrating?: number;
  runtime?: string;
  streamingAvailability?: {
    country?: {
      IN?: RapidApiStreamingEntry[];
    };
  };
}

function parseRuntime(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : null;
}

async function fetchLive(imdbId: string): Promise<TitleDetails | null> {
  const url = `https://${env.rapidApiHost}/gettitleDetails?imdbid=${encodeURIComponent(imdbId)}`;
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": env.rapidApiKey,
      "X-RapidAPI-Host": env.rapidApiHost,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RapidApiTitleDetailsResponse;
  const inLinks = json.streamingAvailability?.country?.IN ?? [];
  const ottLinks: OttLink[] = inLinks.map((l) => ({
    platform: l.platform,
    displayName: platformDisplayName(l.platform),
    url: l.url,
  }));
  return {
    imdbRating: typeof json.imdbrating === "number" ? json.imdbrating : null,
    runtime: parseRuntime(json.runtime),
    ottLinks,
  };
}

const MOCK_PLATFORM_HOMEPAGE: Record<string, string> = {
  netflix: "https://www.netflix.com/in/",
  amazonprimevideo: "https://www.primevideo.com/",
  hotstar: "https://www.hotstar.com/in",
  jiocinema: "https://www.jiocinema.com/",
  appletv: "https://tv.apple.com/in",
  zee5: "https://www.zee5.com/",
};

const INDIAN_LANGS = new Set(["hi", "ta", "te", "kn"]);

function mockDetails(imdbId: string): TitleDetails | null {
  const t = MOCK_TITLES.find((m) => m.imdb_id === imdbId);
  if (!t) return null;
  const platforms = INDIAN_LANGS.has(t.original_language)
    ? ["hotstar", "jiocinema", "netflix"]
    : ["netflix", "amazonprimevideo", "appletv"];
  return {
    imdbRating: t.imdb_rating,
    runtime: t.runtime,
    ottLinks: platforms.map((p) => ({
      platform: p,
      displayName: platformDisplayName(p),
      url: MOCK_PLATFORM_HOMEPAGE[p],
    })),
  };
}

export async function getTitleDetails(imdbId: string): Promise<TitleDetails | null> {
  if (!hasRapidApi) return mockDetails(imdbId);
  return fetchLive(imdbId);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// RapidAPI's BASIC plan enforces a strict ~1 req/sec rate limit — pace
// sequential calls at least this far apart, never Promise.all them.
export const RAPIDAPI_PACING_MS = 1100;
