# API Contract — Movie & TV Matchmaker

Server base URL during dev: `http://localhost:4000/api` (iOS Simulator shares the Mac's network, so `localhost` works directly; for real devices later, swap to the Mac's LAN IP — only the `EXPO_PUBLIC_API_URL` env value changes, no code change).

All bodies/responses are JSON. All errors: `{ "error": "message" }` with a 4xx/5xx status.

## Identity

No auth. Each app install generates and persists a `deviceId` (UUID v4) in AsyncStorage on first launch. It's sent on every request that needs to know "which partner is this." The session's creator becomes partner `A`; whoever joins via code/QR becomes partner `B`.

## Session lifecycle (`sessions.status`)

`waiting` (created, nobody joined) → `collecting` (both joined, waiting on one or both preference forms) → `generating` (both submitted, server is building the pool) → `swiping` (pool ready for the current round) → on round complete: `matched` (done) OR back to `generating` for round 2 → after round 2 with no match: `final_pick` → `done` (after rating, optional).

`sessions.round` is `0` before any pool exists, then `1` or `2`.

Clients should **poll `GET /api/sessions/:code`** every ~2s while waiting on a state transition they don't control (simplest, no realtime infra needed to build/debug first — Supabase Realtime subscription on the `sessions` row is a nice-to-have upgrade the app can add on top of the same endpoint's data shape, not a required dependency for correctness).

## Endpoints

### `POST /api/sessions`
Create a session. Body: `{ "deviceId": string }`
→ `201 { "code": string, "id": string, "status": "waiting", "round": 0 }`

### `POST /api/sessions/:code/join`
Body: `{ "deviceId": string }`
→ `200 { "id": string, "status": "collecting", "round": 0 }`
Errors: `404` unknown code, `409` if a third distinct device tries to join (session already has A and B).

### `GET /api/sessions/:code`
→ `200 { "id": string, "code": string, "status": SessionStatus, "round": number, "partnerASubmitted": boolean, "partnerBSubmitted": boolean }`
(Never leaks the *content* of either partner's profile — just submission booleans, so B truly can't see A's answers.)

### `POST /api/sessions/:code/profile`
Body:
```
{
  "deviceId": string,
  "moods": string[],          // subset of ["light_fun","intense_gripping","scary","romantic","other"]
  "moodText": string,         // optional, may be ""
  "languages": string[],      // subset of ["hindi","english","tamil","telugu","kannada"], or ["any"]
  "contentType": "movies_only" | "include_series",
  "minRating": 6 | 7 | 8 | 9,
  "eras": string[]            // subset of ["classic","2000_2020","recent"], or ["any"]
}
```
→ `200 { "ok": true }`. Server resolves `deviceId` to partner A or B via the session's stored device ids; `403` if the device hasn't joined this session. When both profiles are in, the server flips status to `generating` and kicks off round-1 pool generation asynchronously (fire-and-forget from the client's perspective — poll `GET /sessions/:code` until status is `swiping`).

### `GET /api/sessions/:code/pool?round=1|2`
→ `200 { "round": number, "titles": Title[] }` where
```
type Title = {
  tmdbId: number,
  mediaType: "movie" | "tv",
  title: string,
  year: number,
  posterUrl: string | null,
  rating: number,        // 0-10, TMDB vote_average (see README note on "IMDb rating")
  runtimeMinutes: number | null,
  synopsis: string
}
```
`404` if that round's pool isn't ready yet (still `generating`).

### `POST /api/sessions/:code/swipe`
Body: `{ "deviceId": string, "round": number, "tmdbId": number, "direction": "right" | "left" }`
→ `200 { "ok": true }`. When this completes a partner's full pass over the round's pool, server checks if *both* partners are done with the round:
- If a mutual right-swipe exists → picks the earliest chronological mutual right-swipe, fetches Indian OTT links, writes the match, sets status `matched`.
- Else if round 1 just completed → generates round 2 (status back to `generating`, then `swiping` once ready).
- Else (round 2 just completed, still no match) → computes top 5 by combined right-swipe score, sets status `final_pick`.

### `GET /api/sessions/:code/match`
→ `200 { "title": Title, "ottPlatforms": { "name": string, "url": string, "type": "subscription"|"rent"|"buy"|"free" }[] }` (valid once status is `matched`)

### `GET /api/sessions/:code/final-pick`
→ `200 { "titles": (Title & { combinedScore: number })[] }` (valid once status is `final_pick`, length ≤ 5)

### `POST /api/ratings`
Body: `{ "sessionId": string, "deviceId": string, "tmdbId": number, "rating": number }` (1-5)
→ `200 { "ok": true }`

### `GET /api/history?deviceId=...`
→ `200 { "sessions": { "code": string, "status": string, "matchedTitle": Title | null, "yourRating": number | null, "createdAt": string }[] }`, most recent first.

## Env vars (server holds all secrets; never in client code)

`ANTHROPIC_API_KEY` (optional — deterministic fallback if unset), `TMDB_API_KEY`, `RAPIDAPI_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT` (default 4000).

The mobile app only ever holds `EXPO_PUBLIC_API_URL` and, optionally, `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` if/when Realtime is wired in — the anon key is safe to embed by design (Supabase RLS protects it), unlike every other key in this project.
