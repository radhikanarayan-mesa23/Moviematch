// Shared types mirrored from API_CONTRACT.md — keep in sync with that file.

export type Partner = "A" | "B";

export type Mood = "light_fun" | "intense_gripping" | "scary" | "romantic" | "other";
export type Language = "hindi" | "english" | "tamil" | "telugu" | "kannada" | "any";
export type ContentType = "movies_only" | "include_series";
export type Era = "classic" | "2000_2020" | "recent" | "any";
export type SessionStatus =
  | "waiting"
  | "collecting"
  | "generating"
  | "swiping"
  | "matched"
  | "final_pick"
  | "done";

export interface ProfileInput {
  deviceId: string;
  moods: Mood[];
  moodText: string;
  languages: Language[];
  contentType: ContentType;
  minRating: 6 | 7 | 8 | 9;
  eras: Era[];
}

/** Shape stored in `profiles` rows, without the deviceId (already resolved to a partner). */
export interface ProfileRecord {
  moods: string[];
  moodText: string;
  languages: string[];
  contentType: ContentType;
  minRating: number;
  eras: string[];
}

export type MediaType = "movie" | "tv";

export interface Title {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number;
  posterUrl: string | null;
  rating: number;
  runtimeMinutes: number | null;
  synopsis: string;
}

export interface OttPlatform {
  name: string;
  url: string;
  type: "subscription" | "rent" | "buy" | "free";
}

export interface Brief {
  genreHints: string[];
  keywordHints: string[];
  toneNotes: string;
  languagePriority: string[];
}
