export type Mood = "light" | "intense" | "scary" | "romantic" | "other";
export type LanguageCode = "hi" | "en" | "ta" | "te" | "kn" | "any";
export type Era = "any" | "classic" | "mid" | "recent";
export type ContentType = "movies" | "series";
export type MinRating = 6 | 7 | 8 | 9;
export type MediaType = "movie" | "tv";
export type Role = "A" | "B";
export type SwipeDirection = "left" | "right";

export type SessionStatus =
  | "waiting_a"
  | "waiting_b"
  | "generating_brief"
  | "swiping"
  | "match_found"
  | "final_choice"
  | "completed";

export interface Preferences {
  moods: Mood[];
  moodText: string;
  languages: LanguageCode[];
  contentType: ContentType;
  minRating: MinRating;
  eras: Era[];
}

export interface SearchBrief {
  summary: string;
  tmdb_genres: number[];
  exclude_genres: number[];
  original_languages: string[];
  min_vote_average: number;
  year_gte: number;
  year_lte: number;
  include_series: boolean;
  mood_keywords: string[];
}

export interface OttLink {
  platform: string;
  displayName: string;
  url: string;
}

export interface PooledTitle {
  tmdb_id: number;
  imdb_id: string | null;
  media_type: MediaType;
  title: string;
  year: number | null;
  poster_path: string | null;
  imdb_rating: number | null;
  runtime: number | null;
  overview: string | null;
  genres: number[];
}

export interface CandidateTitle {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  genres: number[];
  tmdb_vote_average: number;
  original_language: string;
}

export interface SessionRow {
  id: string;
  code: string;
  couple_id: string | null;
  status: SessionStatus;
  round: number;
  brief: SearchBrief | null;
  match_tmdb_id: number | null;
  match_media_type: MediaType | null;
  match_ott: OttLink[] | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  role: Role;
  device_id: string;
  preferences: Preferences | null;
  submitted_at: string | null;
  finished_round: number;
}

export interface TitlesPoolRow extends PooledTitle {
  id: string;
  session_id: string;
  round: number;
}

export interface SwipeRow {
  id: string;
  session_id: string;
  participant_id: string;
  round: number;
  tmdb_id: number;
  media_type: MediaType;
  direction: SwipeDirection;
}

export interface RatingRow {
  id: string;
  session_id: string;
  couple_id: string | null;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  stars: number;
  created_at: string;
}
