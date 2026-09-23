# Movie & TV Matchmaker — Server

Backend for the Movie & TV Matchmaker app. Node + TypeScript + Express, using Supabase (Postgres) for storage, Claude for building a search brief from both partners' preferences, TMDB for candidate titles, and RapidAPI's Streaming Availability API for Indian OTT links.

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in real values (`ANTHROPIC_API_KEY`, `TMDB_API_KEY`, `RAPIDAPI_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). `ANTHROPIC_API_KEY` is optional — without it, Claude-powered steps fall back to a deterministic brief built from structured preferences alone.
3. Run `supabase/schema.sql` once in the Supabase SQL editor (Project → SQL Editor → New query → paste → Run).
4. `npm run dev` — starts the server on `http://localhost:4000` (or `PORT` from `.env`) with watch mode.

## Endpoints

See `../API_CONTRACT.md` at the project root for the authoritative request/response shapes. All routes are mounted under `/api`.

## Notes

- The server owns all writes; Supabase Row Level Security is defense-in-depth only (all DB access uses the service-role key, which bypasses RLS).
- Round-1 pool generation is kicked off asynchronously right after both partners submit their profile (the `POST /profile` response doesn't wait on it). Poll `GET /api/sessions/:code` for the `status` transition to `swiping`.
- Round-2 generation and match/final-pick resolution are likewise triggered fire-and-forget after the swipe that completes a round — poll the same session endpoint.
