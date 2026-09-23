# Tonight

A movie/TV matchmaker for two people who can never agree what to watch. Both
partners set preferences independently, swipe through the same pool of
titles, and get pushed straight to a match — with exactly where to watch it
in India, right now.

Built with Next.js 16 (App Router, TypeScript, Tailwind v4), Supabase
(Postgres + Realtime), TMDB, the RapidAPI `ott-details` endpoint, and Gemini
(`@google/genai`).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in your Supabase
project's SQL Editor (Dashboard → SQL Editor → New query → paste → Run). It
creates the six tables (`couples`, `sessions`, `participants`,
`titles_pool`, `swipes`, `ratings`), enables RLS, and adds `sessions` to the
`supabase_realtime` publication.

> The script starts with `drop table if exists ...` for these six tables —
> only run it against a project that doesn't have other data in tables with
> these names.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TMDB_READ_ACCESS_TOKEN=  # v4 read access token — preferred if both are set
TMDB_API_KEY=             # v3 key — fallback

RAPIDAPI_KEY=
RAPIDAPI_HOST=ott-details.p.rapidapi.com

GEMINI_API_KEY=
```

**Mock mode:** any missing key falls back automatically — Supabase falls
back to an in-process store (fine for local/demo use, not for a
multi-instance production deploy), TMDB/RapidAPI fall back to a small set
of real, verified titles (`src/lib/mockData.ts`), and Gemini falls back to
a hand-written mood→genre heuristic. The whole flow is clickable with zero
keys configured.

## How it works

1. Partner A sets preferences at `/start`, gets a 6-char session code and a
   QR code to share (`/session/[code]/lobby`).
2. Partner B scans it (`/join/[code]`) and sets their own preferences,
   never seeing A's answers. Submitting synchronously builds a 30-title
   pool: Gemini merges both preference sets into a search brief, TMDB
   supplies candidates, Gemini ranks them for mood fit, and each survivor
   is enriched with its real IMDb rating + India streaming links via
   RapidAPI (paced ~1.1s apart — its Basic plan rate-limits at ~1 req/s).
3. Both partners swipe the same pool, independently shuffled
   (`/session/[code]/swipe`). Supabase Realtime pushes session/round
   changes between devices with no polling (falls back to polling in mock
   mode).
4. A right-swipe overlap ends the round in a match
   (`/session/[code]/match`) with a fresh OTT lookup and a 1–5 star rating.
   No overlap after round 1 triggers a refined round 2, leaning into what
   both partners liked. No overlap after round 2 shows the top 5
   right-swiped titles for the couple to pick manually
   (`/session/[code]/final-choice`).
5. `/history` shows a device-pair's past matches and ratings — there's no
   login; two devices resolve to a stable `couple_id` via
   `sha256(sorted([deviceA, deviceB]))`.

## Deployment

Standard Next.js app — Vercel needs no extra config beyond setting the env
vars above on the project. For Cloudflare Workers, use
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) with
`compatibility_flags: ["nodejs_compat"]` (needed for `node:crypto`, used in
the couple-id hash).
