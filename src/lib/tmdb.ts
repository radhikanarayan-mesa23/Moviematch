import { env, hasTmdb } from "@/lib/env";
import { MOCK_TITLES } from "@/lib/mockData";
import type { CandidateTitle, MediaType, SearchBrief } from "@/lib/types";

const TMDB_BASE = "https://api.themoviedb.org/3";

function isV4Token(key: string): boolean {
  return key.startsWith("eyJ");
}

function tmdbUrl(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(TMDB_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }
  if (hasTmdb && !isV4Token(env.tmdbApiKey)) {
    url.searchParams.set("api_key", env.tmdbApiKey);
  }
  return url.toString();
}

function tmdbHeaders(): HeadersInit {
  if (hasTmdb && isV4Token(env.tmdbApiKey)) {
    return { Authorization: `Bearer ${env.tmdbApiKey}`, accept: "application/json" };
  }
  return { accept: "application/json" };
}

export function posterUrl(path: string | null, size: "w300" | "w500" = "w500"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

interface TmdbDiscoverResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  genre_ids: number[];
  original_language: string;
  release_date?: string;
  first_air_date?: string;
}

async function discoverPage(
  mediaType: MediaType,
  page: number,
  originalLanguage: string | undefined,
  brief: SearchBrief
): Promise<TmdbDiscoverResult[]> {
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const url = tmdbUrl(`/discover/${mediaType}`, {
    page,
    sort_by: "popularity.desc",
    include_adult: false,
    with_original_language: originalLanguage,
    "vote_average.gte": Math.max(0, brief.min_vote_average - 0.5),
    [`${dateField}.gte`]: `${brief.year_gte}-01-01`,
    [`${dateField}.lte`]: `${brief.year_lte}-12-31`,
    with_genres: brief.tmdb_genres.length ? brief.tmdb_genres.join(",") : undefined,
    without_genres: brief.exclude_genres.length ? brief.exclude_genres.join(",") : undefined,
    "vote_count.gte": 20,
  });
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) return [];
  const json = await res.json();
  return json.results ?? [];
}

function toCandidate(mediaType: MediaType, r: TmdbDiscoverResult): CandidateTitle {
  const dateStr = mediaType === "movie" ? r.release_date : r.first_air_date;
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;
  return {
    tmdb_id: r.id,
    media_type: mediaType,
    title: (mediaType === "movie" ? r.title : r.name) || "Untitled",
    year,
    poster_path: r.poster_path,
    overview: r.overview || null,
    genres: r.genre_ids || [],
    tmdb_vote_average: r.vote_average ?? 0,
    original_language: r.original_language,
  };
}

function mockCandidates(brief: SearchBrief, excludeIds: Set<string>): CandidateTitle[] {
  return MOCK_TITLES.filter((t) => {
    if (excludeIds.has(`${t.media_type}:${t.tmdb_id}`)) return false;
    if (t.media_type === "tv" && !brief.include_series) return false;
    if (t.year < brief.year_gte || t.year > brief.year_lte) return false;
    if (
      brief.original_languages.length &&
      !brief.original_languages.includes(t.original_language)
    ) {
      return false;
    }
    if (t.imdb_rating < brief.min_vote_average - 1) return false;
    return true;
  }).map((t) => ({
    tmdb_id: t.tmdb_id,
    media_type: t.media_type,
    title: t.title,
    year: t.year,
    poster_path: t.poster_path,
    overview: t.overview,
    genres: t.genres,
    tmdb_vote_average: t.imdb_rating,
    original_language: t.original_language,
  }));
}

/**
 * Fetches discover candidates for a brief: one /discover call per requested
 * language (TMDB can't OR multiple with_original_language values) x up to
 * 2 pages, for movie and (if requested) tv, deduped by media_type:tmdb_id.
 */
export async function discoverCandidates(
  brief: SearchBrief,
  excludeIds: Set<string> = new Set()
): Promise<CandidateTitle[]> {
  if (!hasTmdb) return mockCandidates(brief, excludeIds);

  const mediaTypes: MediaType[] = brief.include_series ? ["movie", "tv"] : ["movie"];
  const languages = brief.original_languages.length ? brief.original_languages : [undefined];
  const seen = new Map<string, CandidateTitle>();

  for (const mediaType of mediaTypes) {
    for (const lang of languages) {
      for (let page = 1; page <= 2; page++) {
        const results = await discoverPage(mediaType, page, lang, brief);
        for (const r of results) {
          const key = `${mediaType}:${r.id}`;
          if (excludeIds.has(key) || seen.has(key)) continue;
          seen.set(key, toCandidate(mediaType, r));
        }
        if (results.length === 0) break;
      }
    }
  }

  return Array.from(seen.values());
}

interface ExternalIdsResult {
  imdb_id: string | null;
  runtime: number | null;
}

async function fetchExternalIdsLive(mediaType: MediaType, tmdbId: number): Promise<ExternalIdsResult> {
  const url = tmdbUrl(`/${mediaType}/${tmdbId}`, { append_to_response: "external_ids" });
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) return { imdb_id: null, runtime: null };
  const json = await res.json();
  const imdb_id = json.external_ids?.imdb_id ?? json.imdb_id ?? null;
  let runtime: number | null = null;
  if (mediaType === "movie") {
    runtime = json.runtime ?? null;
  } else if (Array.isArray(json.episode_run_time) && json.episode_run_time.length > 0) {
    runtime = json.episode_run_time[0];
  }
  return { imdb_id, runtime };
}

export async function fetchExternalIds(
  mediaType: MediaType,
  tmdbId: number
): Promise<ExternalIdsResult> {
  if (!hasTmdb) {
    const mock = MOCK_TITLES.find((t) => t.media_type === mediaType && t.tmdb_id === tmdbId);
    return mock ? { imdb_id: mock.imdb_id, runtime: mock.runtime } : { imdb_id: null, runtime: null };
  }
  return fetchExternalIdsLive(mediaType, tmdbId);
}
