// Thin typed fetch wrapper matching API_CONTRACT.md exactly.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type SessionStatus =
  | 'waiting'
  | 'collecting'
  | 'generating'
  | 'swiping'
  | 'matched'
  | 'final_pick'
  | 'done';

export type MediaType = 'movie' | 'tv';

export type Title = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number;
  posterUrl: string | null;
  rating: number;
  runtimeMinutes: number | null;
  synopsis: string;
};

export type TitleWithScore = Title & { combinedScore: number };

export type OttPlatform = {
  name: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
};

export type CreateSessionResponse = {
  code: string;
  id: string;
  status: SessionStatus;
  round: number;
};

export type JoinSessionResponse = {
  id: string;
  status: SessionStatus;
  round: number;
};

export type SessionState = {
  id: string;
  code: string;
  status: SessionStatus;
  round: number;
  partnerASubmitted: boolean;
  partnerBSubmitted: boolean;
};

export type ProfileBody = {
  deviceId: string;
  moods: string[];
  moodText: string;
  languages: string[];
  contentType: 'movies_only' | 'include_series';
  minRating: 6 | 7 | 8 | 9;
  eras: string[];
};

export type PoolResponse = {
  round: number;
  titles: Title[];
};

export type SwipeBody = {
  deviceId: string;
  round: number;
  tmdbId: number;
  direction: 'right' | 'left';
};

export type MatchResponse = {
  title: Title;
  ottPlatforms: OttPlatform[];
};

export type FinalPickResponse = {
  titles: TitleWithScore[];
};

export type RatingBody = {
  sessionId: string;
  deviceId: string;
  tmdbId: number;
  rating: number;
};

export type HistoryEntry = {
  code: string;
  status: string;
  matchedTitle: Title | null;
  yourRating: number | null;
  createdAt: string;
};

export type HistoryResponse = {
  sessions: HistoryEntry[];
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { method = 'GET', body, query } = options;

  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (data && (data as { error?: string }).error) || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const api = {
  createSession: (deviceId: string) =>
    request<CreateSessionResponse>('/sessions', { method: 'POST', body: { deviceId } }),

  joinSession: (code: string, deviceId: string) =>
    request<JoinSessionResponse>(`/sessions/${code}/join`, { method: 'POST', body: { deviceId } }),

  getSession: (code: string) => request<SessionState>(`/sessions/${code}`),

  submitProfile: (code: string, body: ProfileBody) =>
    request<{ ok: true }>(`/sessions/${code}/profile`, { method: 'POST', body }),

  getPool: (code: string, round: number) =>
    request<PoolResponse>(`/sessions/${code}/pool`, { query: { round } }),

  swipe: (code: string, body: SwipeBody) =>
    request<{ ok: true }>(`/sessions/${code}/swipe`, { method: 'POST', body }),

  getMatch: (code: string) => request<MatchResponse>(`/sessions/${code}/match`),

  getFinalPick: (code: string) => request<FinalPickResponse>(`/sessions/${code}/final-pick`),

  submitRating: (body: RatingBody) => request<{ ok: true }>('/ratings', { method: 'POST', body }),

  getHistory: (deviceId: string) => request<HistoryResponse>('/history', { query: { deviceId } }),
};

export { BASE_URL };
