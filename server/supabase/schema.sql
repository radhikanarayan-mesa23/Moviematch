-- Movie & TV Matchmaker — Supabase schema
-- Run once in the Supabase SQL editor (Project > SQL Editor > New query).
-- All access from the server uses the service-role key, which bypasses RLS,
-- so RLS below exists only as defense-in-depth in case the anon key is ever
-- used directly from the client (e.g. for Realtime subscriptions on `sessions`).

create extension if not exists pgcrypto;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'waiting'
    check (status in ('waiting','collecting','generating','swiping','matched','final_pick','done')),
  round int not null default 0,
  creator_device_id text not null,
  joiner_device_id text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  partner text not null check (partner in ('A','B')),
  moods text[] not null default '{}',
  mood_text text not null default '',
  languages text[] not null default '{}',
  content_type text not null check (content_type in ('movies_only','include_series')),
  min_rating int not null check (min_rating in (6,7,8,9)),
  eras text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (session_id, partner)
);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  titles jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (session_id, round)
);

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  partner text not null check (partner in ('A','B')),
  tmdb_id bigint not null,
  direction text not null check (direction in ('left','right')),
  created_at timestamptz not null default now(),
  unique (session_id, round, partner, tmdb_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  tmdb_id bigint not null,
  ott_platforms jsonb not null default '[]',
  matched_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  device_id text not null,
  tmdb_id bigint not null,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (session_id, device_id, tmdb_id)
);

create index if not exists idx_sessions_code on sessions(code);
create index if not exists idx_profiles_session on profiles(session_id);
create index if not exists idx_swipes_session_round on swipes(session_id, round);
create index if not exists idx_ratings_device on ratings(device_id);

alter table sessions enable row level security;
alter table profiles enable row level security;
alter table pools enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table ratings enable row level security;

-- Permissive anon read policy on sessions only, to support a future Realtime
-- subscription from the client for live status updates. Writes stay server-only
-- (service role). No anon policy is created for the other tables since profile
-- content, swipes, matches and ratings should only ever be read/written via the
-- server's validated endpoints.
create policy "anon can read sessions" on sessions
  for select using (true);
