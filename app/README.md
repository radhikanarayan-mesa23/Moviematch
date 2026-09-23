# Movie Match — Mobile App

Expo (managed workflow, TypeScript) client for the Movie & TV Matchmaker, built with
Expo Router. See `../API_CONTRACT.md` for the API this app talks to.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` if you need to point at something other than the default
API URL (`http://localhost:4000/api`, which works from the iOS Simulator out of the box).

## Running

**The backend (`server/`) must be running on port 4000 first.**

```bash
npx expo start
```

Then press `i` to launch the iOS Simulator (or scan the QR with Expo Go on a physical
device, after changing `EXPO_PUBLIC_API_URL` in `.env` to your Mac's LAN IP).

## Project layout

- `app/` — Expo Router screens (file-based routing): entry, join, preferences, QR
  share, waiting room, swipe deck, match reveal, final shortlist, rating, history.
- `components/` — `PreferenceForm`, `SwipeCard` (gesture-driven deck card), and
  shared UI primitives (`ui.tsx`).
- `lib/` — `api.ts` (typed fetch wrapper matching `API_CONTRACT.md`), `deviceId.ts`
  (persistent per-install UUID), `theme.ts` (design tokens).
