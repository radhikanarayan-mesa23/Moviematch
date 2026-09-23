import type { Era, LanguageCode, MediaType, Mood } from "./types";

// TMDB genre ids differ slightly between movie and tv catalogues.
export const MOVIE_GENRES: Record<string, number> = {
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
  scifi: 878,
  thriller: 53,
  war: 10752,
  western: 37,
};

export const TV_GENRES: Record<string, number> = {
  action: 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  kids: 10762,
  mystery: 9648,
  scifi: 10765,
  soap: 10766,
  war: 10768,
  western: 37,
};

const MOOD_MOVIE_GENRES: Record<Mood, number[]> = {
  light: [MOVIE_GENRES.comedy, MOVIE_GENRES.family, MOVIE_GENRES.animation],
  intense: [MOVIE_GENRES.thriller, MOVIE_GENRES.drama, MOVIE_GENRES.crime, MOVIE_GENRES.action],
  scary: [MOVIE_GENRES.horror, MOVIE_GENRES.mystery],
  romantic: [MOVIE_GENRES.romance, MOVIE_GENRES.comedy],
  other: [],
};

const MOOD_TV_GENRES: Record<Mood, number[]> = {
  light: [TV_GENRES.comedy, TV_GENRES.family, TV_GENRES.animation],
  intense: [TV_GENRES.drama, TV_GENRES.crime, TV_GENRES.action],
  scary: [TV_GENRES.mystery, TV_GENRES.scifi],
  romantic: [TV_GENRES.drama, TV_GENRES.comedy],
  other: [],
};

export function moodsToGenres(moods: Mood[], mediaType: MediaType): number[] {
  const table = mediaType === "movie" ? MOOD_MOVIE_GENRES : MOOD_TV_GENRES;
  const set = new Set<number>();
  for (const mood of moods) {
    for (const g of table[mood] ?? []) set.add(g);
  }
  return Array.from(set);
}

export const LANGUAGE_TMDB_CODE: Record<Exclude<LanguageCode, "any">, string> = {
  hi: "hi",
  en: "en",
  ta: "ta",
  te: "te",
  kn: "kn",
};

export const LANGUAGE_LABEL: Record<LanguageCode, string> = {
  hi: "Hindi",
  en: "English",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  any: "Any",
};

export function eraToYearRange(eras: Era[]): { gte: number; lte: number } {
  if (eras.length === 0 || eras.includes("any")) {
    return { gte: 1950, lte: 2026 };
  }
  let gte = 3000;
  let lte = 0;
  for (const era of eras) {
    if (era === "classic") {
      gte = Math.min(gte, 1950);
      lte = Math.max(lte, 1999);
    } else if (era === "mid") {
      gte = Math.min(gte, 2000);
      lte = Math.max(lte, 2020);
    } else if (era === "recent") {
      gte = Math.min(gte, 2021);
      lte = Math.max(lte, 2026);
    }
  }
  return { gte, lte };
}

// Raw platform codes returned by the RapidAPI ott-details endpoint are
// lowercase, e.g. "netflix", "amazonprimevideo", "hotstar".
export const PLATFORM_DISPLAY_NAME: Record<string, string> = {
  netflix: "Netflix",
  amazonprimevideo: "Amazon Prime Video",
  primevideo: "Amazon Prime Video",
  hotstar: "Disney+ Hotstar",
  disneyplushotstar: "Disney+ Hotstar",
  zee5: "ZEE5",
  hungamaplay: "Hungama Play",
  itunes: "Apple TV",
  appletv: "Apple TV",
  play: "Google Play Movies",
  googleplaymovies: "Google Play Movies",
  youtube: "YouTube",
  sonyliv: "SonyLIV",
  jiocinema: "JioCinema",
  mxplayer: "MX Player",
  voot: "Voot",
  altbalaji: "ALTBalaji",
  erosnow: "Eros Now",
  lionsgateplay: "Lionsgate Play",
};

export function platformDisplayName(code: string): string {
  return (
    PLATFORM_DISPLAY_NAME[code.toLowerCase()] ||
    code
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
