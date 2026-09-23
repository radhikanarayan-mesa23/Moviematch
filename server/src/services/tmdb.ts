import type { Brief, MediaType, ProfileRecord, Title } from "../types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

function apiKey(): string {
  return process.env.TMDB_API_KEY || "";
}

const LANGUAGE_MAP: Record<string, string> = {
  hindi: "hi",
  english: "en",
  tamil: "ta",
  telugu: "te",
  kannada: "kn",
};

// Standard TMDB genre ids. TV has no dedicated "Thriller"/"Horror" genre, so
// those hints simply won't narrow the TV query (they still narrow movies).
const MOVIE_GENRES: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  "sci-fi": 878,
  thriller: 53,
  war: 10752,
  western: 37,
};

const TV_GENRES: Record<string, number> = {
  action: 10759,
  adventure: 10759,
  "action & adventure": 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 10765,
  "sci-fi": 10765,
  "science fiction": 10765,
  "sci-fi & fantasy": 10765,
  kids: 10762,
  mystery: 9648,
  news: 10763,
  reality: 10764,
  romance: 10749,
  soap: 10766,
  talk: 10767,
  war: 10768,
  "war & politics": 10768,
  western: 37,
};

interface DateRange {
  gte?: string;
  lte?: string;
}

interface DiscoverOpts {
  excludeTmdbIds?: number[];
  targetCount?: number;
}

async function tmdbFetch(path: string, params: Record<string, string | number | undefined>): Promise<any> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}) for ${path}`);
  }
  return res.json();
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function resolveGenreIds(mediaType: MediaType, hints: string[]): number[] {
  const map = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
  const ids = new Set<number>();
  for (const hint of hints) {
    const id = map[normalize(hint)];
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

const keywordIdCache = new Map<string, number | null>();

async function resolveKeywordIds(hints: string[]): Promise<number[]> {
  const ids: number[] = [];
  // Cap lookups — keyword hints are a "nice to have" narrowing signal, not core.
  for (const hint of hints.slice(0, 3)) {
    const key = normalize(hint);
    if (!key) continue;
    if (keywordIdCache.has(key)) {
      const cached = keywordIdCache.get(key);
      if (cached) ids.push(cached);
      continue;
    }
    try {
      const data = await tmdbFetch("/search/keyword", { query: key });
      const id: number | null = data?.results?.[0]?.id ?? null;
      keywordIdCache.set(key, id);
      if (id) ids.push(id);
    } catch {
      keywordIdCache.set(key, null);
    }
  }
  return ids;
}

function mapEraToRange(era: string): DateRange | null {
  switch (era) {
    case "classic":
      return { lte: "1999-12-31" };
    case "2000_2020":
      return { gte: "2000-01-01", lte: "2020-12-31" };
    case "recent":
      return { gte: "2021-01-01" };
    default:
      return null; // "any" or unrecognized
  }
}

/** Union of both partners' era selections. TMDB discover only supports a single
 * gte/lte pair per call, so a union spanning multiple distinct buckets (e.g.
 * "classic" + "recent" but not "2000_2020") is handled by running one discover
 * call per bucket and merging results — see discoverTitles. If either partner
 * picked "any" (or neither narrowed at all), the union is unrestricted. */
function unionEraRanges(profileA: ProfileRecord, profileB: ProfileRecord): DateRange[] {
  const union = new Set<string>([...profileA.eras, ...profileB.eras]);
  if (union.size === 0 || union.has("any")) return [{}];
  const ranges: DateRange[] = [];
  for (const era of union) {
    const r = mapEraToRange(era);
    if (r) ranges.push(r);
  }
  return ranges.length > 0 ? ranges.slice(0, 3) : [{}];
}

/** Union of both partners' language selections (same reasoning as eras: TMDB's
 * with_original_language takes one code, so multiple languages become multiple
 * discover calls, merged afterward). "any"/empty on either side ⇒ unrestricted. */
function unionLanguageCodes(profileA: ProfileRecord, profileB: ProfileRecord): (string | undefined)[] {
  const union = new Set<string>([...profileA.languages, ...profileB.languages]);
  if (union.size === 0 || union.has("any")) return [undefined];
  const codes = Array.from(union)
    .map((l) => LANGUAGE_MAP[l])
    .filter((c): c is string => Boolean(c));
  return codes.length > 0 ? codes.slice(0, 3) : [undefined];
}

function mediaTypesFor(profileA: ProfileRecord, profileB: ProfileRecord): MediaType[] {
  if (profileA.contentType === "movies_only" || profileB.contentType === "movies_only") {
    return ["movie"];
  }
  return ["movie", "tv"];
}

interface RawResult {
  id: number;
  mediaType: MediaType;
  title: string;
  year: number;
  posterPath: string | null;
  rating: number;
  synopsis: string;
  popularity: number;
  matchedGenres: number;
}

async function discoverPage(
  mediaType: MediaType,
  page: number,
  langCode: string | undefined,
  range: DateRange,
  minRating: number,
  genreIds: number[],
  keywordIds: number[]
): Promise<RawResult[]> {
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const params: Record<string, string | number | undefined> = {
    sort_by: "popularity.desc",
    include_adult: "false",
    region: "IN",
    page,
    with_original_language: langCode,
    [`${dateField}.gte`]: range.gte,
    [`${dateField}.lte`]: range.lte,
    "vote_average.gte": minRating > 0 ? minRating : undefined,
    with_genres: genreIds.length ? genreIds.join("|") : undefined,
    with_keywords: keywordIds.length ? keywordIds.join("|") : undefined,
  };

  try {
    const data = await tmdbFetch(`/discover/${mediaType}`, params);
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((r: any) => ({
      id: r.id,
      mediaType,
      title: mediaType === "movie" ? r.title : r.name,
      year: parseYear(mediaType === "movie" ? r.release_date : r.first_air_date),
      posterPath: r.poster_path ?? null,
      rating: typeof r.vote_average === "number" ? r.vote_average : 0,
      synopsis: r.overview ?? "",
      popularity: typeof r.popularity === "number" ? r.popularity : 0,
      matchedGenres: Array.isArray(r.genre_ids)
        ? r.genre_ids.filter((g: number) => genreIds.includes(g)).length
        : 0,
    }));
  } catch (err) {
    console.error(`[tmdb] discover/${mediaType} page ${page} failed:`, err);
    return [];
  }
}

function parseYear(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const y = parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(y) ? y : 0;
}

async function fetchRuntime(mediaType: MediaType, id: number): Promise<number | null> {
  try {
    const data = await tmdbFetch(`/${mediaType}/${id}`, {});
    if (mediaType === "movie") {
      return typeof data?.runtime === "number" && data.runtime > 0 ? data.runtime : null;
    }
    const episodeRuntimes: number[] = Array.isArray(data?.episode_run_time) ? data.episode_run_time : [];
    return episodeRuntimes.length > 0 ? episodeRuntimes[0] : null;
  } catch {
    return null;
  }
}

/**
 * Pulls ~30 candidate titles from TMDB matching both partners' preferences,
 * ranked using the brief's genre/keyword hints, with a mix of movies/tv when
 * both are allowed. `opts.excludeTmdbIds` filters out titles already shown in
 * a previous round (used for round 2).
 */
export async function discoverTitles(
  profileA: ProfileRecord,
  profileB: ProfileRecord,
  brief: Brief,
  opts: DiscoverOpts = {}
): Promise<Title[]> {
  const targetCount = opts.targetCount ?? 30;
  const excludeIds = new Set(opts.excludeTmdbIds ?? []);
  const minRating = Math.max(profileA.minRating, profileB.minRating);
  const mediaTypes = mediaTypesFor(profileA, profileB);
  const langCodes = unionLanguageCodes(profileA, profileB);
  const eraRanges = unionEraRanges(profileA, profileB);
  const keywordIds = await resolveKeywordIds(brief.keywordHints ?? []);

  const byKey = new Map<string, RawResult>();
  let callCount = 0;
  const MAX_CALLS = 18;

  for (const mediaType of mediaTypes) {
    const genreIds = resolveGenreIds(mediaType, brief.genreHints ?? []);
    for (const langCode of langCodes) {
      for (const range of eraRanges) {
        if (callCount >= MAX_CALLS) break;
        for (const page of [1, 2]) {
          if (callCount >= MAX_CALLS) break;
          callCount++;
          const results = await discoverPage(mediaType, page, langCode, range, minRating, genreIds, keywordIds);
          for (const r of results) {
            const key = `${r.mediaType}:${r.id}`;
            if (excludeIds.has(r.id)) continue;
            if (!byKey.has(key) || byKey.get(key)!.matchedGenres < r.matchedGenres) {
              byKey.set(key, r);
            }
          }
          if (results.length === 0) break; // no more pages for this combo
        }
      }
    }
  }

  const all = Array.from(byKey.values());
  const score = (r: RawResult) => r.matchedGenres * 5 + r.popularity / 50;
  all.sort((a, b) => score(b) - score(a));

  // Diversity pass: when both media types are in play, aim for a healthy mix
  // instead of letting one type's popularity dominate the whole list.
  let selected: RawResult[];
  if (mediaTypes.length === 2) {
    const movies = all.filter((r) => r.mediaType === "movie");
    const tv = all.filter((r) => r.mediaType === "tv");
    const movieTarget = Math.ceil(targetCount * 0.6);
    const tvTarget = targetCount - movieTarget;
    const chosen = [...movies.slice(0, movieTarget), ...tv.slice(0, tvTarget)];
    const chosenKeys = new Set(chosen.map((r) => `${r.mediaType}:${r.id}`));
    // Backfill from whichever pool has leftovers if one type came up short.
    for (const r of all) {
      if (chosen.length >= targetCount) break;
      const key = `${r.mediaType}:${r.id}`;
      if (!chosenKeys.has(key)) {
        chosen.push(r);
        chosenKeys.add(key);
      }
    }
    chosen.sort((a, b) => score(b) - score(a));
    selected = chosen.slice(0, targetCount);
  } else {
    selected = all.slice(0, targetCount);
  }

  const withRuntime = await Promise.all(
    selected.map(async (r) => {
      const runtimeMinutes = await fetchRuntime(r.mediaType, r.id);
      const title: Title = {
        tmdbId: r.id,
        mediaType: r.mediaType,
        title: r.title || "Untitled",
        year: r.year,
        posterUrl: r.posterPath ? `${IMG_BASE}${r.posterPath}` : null,
        rating: r.rating,
        runtimeMinutes,
        synopsis: r.synopsis,
      };
      return title;
    })
  );

  return withRuntime;
}
