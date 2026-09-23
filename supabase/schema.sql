-- "Tonight" — schema for the movie/TV matchmaker.
-- Safe to re-run: types and objects are created idempotently.
--
-- This project previously had an incompatible prototype schema (old
-- Express app): `sessions` with creator_device_id/joiner_device_id,
-- `swipes` with a `partner` column, no `couples`/`participants`/
-- `titles_pool`. The drops below clear that out (just test data — 1
-- session, 19 swipes, 0 ratings at the time this was written) before
-- creating the six-table schema this app expects.

drop table if exists ratings cascade;
drop table if exists swipes cascade;
drop table if exists titles_pool cascade;
drop table if exists participants cascade;
drop table if exists sessions cascade;
drop table if exists couples cascade;

drop type if exists session_status cascade;
drop type if exists participant_role cascade;
drop type if exists media_type_t cascade;
drop type if exists swipe_direction cascade;

create extension if not exists pgcrypto;

do $$ begin
  create type session_status as enum (
    'waiting_a', 'waiting_b', 'generating_brief', 'swiping',
    'match_found', 'final_choice', 'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type participant_role as enum ('A', 'B');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type_t as enum ('movie', 'tv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type swipe_direction as enum ('left', 'right');
exception when duplicate_object then null; end $$;

create table if not exists couples (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  couple_id text references couples(id),
  status session_status not null default 'waiting_a',
  round int not null default 1,
  brief jsonb,
  match_tmdb_id int,
  match_media_type media_type_t,
  match_ott jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role participant_role not null,
  device_id text not null,
  preferences jsonb,
  submitted_at timestamptz,
  finished_round int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, role)
);

create table if not exists titles_pool (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  tmdb_id int not null,
  imdb_id text,
  media_type media_type_t not null,
  title text not null,
  year int,
  poster_path text,
  imdb_rating numeric,
  runtime int,
  overview text,
  genres jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, round, tmdb_id)
);

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  round int not null,
  tmdb_id int not null,
  media_type media_type_t not null,
  direction swipe_direction not null,
  created_at timestamptz not null default now(),
  unique (session_id, participant_id, round, tmdb_id)
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  couple_id text references couples(id),
  tmdb_id int not null,
  media_type media_type_t not null,
  title text not null,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sessions_set_updated_at on sessions;
create trigger sessions_set_updated_at before update on sessions
for each row execute function set_updated_at();

create index if not exists idx_participants_device_id on participants(device_id);
create index if not exists idx_participants_session_id on participants(session_id);
create index if not exists idx_titles_pool_session_round on titles_pool(session_id, round);
create index if not exists idx_swipes_session_round on swipes(session_id, round);
create index if not exists idx_ratings_couple_id on ratings(couple_id);
create index if not exists idx_sessions_couple_id on sessions(couple_id);

alter table couples enable row level security;
alter table sessions enable row level security;
alter table participants enable row level security;
alter table titles_pool enable row level security;
alter table swipes enable row level security;
alter table ratings enable row level security;

-- Only sessions are readable by the public anon key, for the client-side
-- Realtime subscription. Every write, and every read of the other tables,
-- goes through server routes using the service-role key (which bypasses RLS).
drop policy if exists "anon can read sessions" on sessions;
create policy "anon can read sessions" on sessions for select using (true);

-- Enable Realtime on sessions so both partners' clients get pushed
-- status/round changes without polling.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table sessions;
  end if;
end $$;
