-- wellness-rpe schema
-- Run this in the Supabase SQL editor

-- Profiles (replaces users:{username} in window.storage)
create table if not exists profiles (
  username text primary key,
  pass_hash text not null,
  role text not null check (role in ('player', 'coach')),
  display_name text not null,
  team_id text,       -- for players
  team_ids jsonb default '[]',  -- for coaches
  photo_url text
);
alter table profiles enable row level security;
create policy "public read profiles" on profiles for select using (true);
create policy "public insert profiles" on profiles for insert with check (true);
create policy "public update profiles" on profiles for update using (true);

-- Teams
create table if not exists teams (
  team_id text primary key,
  code text unique not null,
  name text not null,
  kind text not null default 'equipo',
  coach_username text not null,
  created_at bigint,
  roster jsonb default '[]',
  first_monday text,
  positions jsonb,
  custom_test_defs jsonb default '[]',
  custom_gps_defs jsonb default '[]',
  physical_quadrant_config jsonb,
  crest_url text
);
alter table teams enable row level security;
create policy "public read teams" on teams for select using (true);
create policy "public insert teams" on teams for insert with check (true);
create policy "public update teams" on teams for update using (true);

-- Wellness entries
create table if not exists wellness (
  id bigserial primary key,
  team_id text not null,
  username text not null,
  date text not null,
  sueno int not null,
  fatiga int not null,
  estres int not null,
  dolor int not null,
  animo int not null,
  comment text,
  comment_read boolean default false,
  display_name text,
  ts bigint,
  unique (team_id, username, date)
);
alter table wellness enable row level security;
create policy "public all wellness" on wellness using (true) with check (true);

-- RPE entries
create table if not exists rpe_entries (
  id bigserial primary key,
  team_id text not null,
  username text not null,
  date text not null,
  rpe int not null,
  duration int not null,
  session_type text,
  planned_intensity text,
  comment text,
  comment_read boolean default false,
  display_name text,
  ts bigint,
  unique (team_id, username, date)
);
alter table rpe_entries enable row level security;
create policy "public all rpe_entries" on rpe_entries using (true) with check (true);

-- Sessions (planned by coach)
create table if not exists sessions (
  id bigserial primary key,
  team_id text not null,
  date text not null,
  session_type text not null,
  intensity text not null,
  is_match boolean default false,
  is_rest boolean default false,
  duration int default 0,
  description text,
  created_at bigint,
  unique (team_id, date)
);
alter table sessions enable row level security;
create policy "public all sessions" on sessions using (true) with check (true);

-- Physical entries (strength + performance metrics)
create table if not exists physical_entries (
  id bigserial primary key,
  team_id text not null,
  username text not null,
  date text not null,
  sentadilla numeric,
  cargada numeric,
  press_banca numeric,
  hip_thrust numeric,
  cmj numeric,
  vam numeric,
  vift numeric,
  vmax numeric,
  acc10 numeric,
  acc30 numeric,
  cod505_right numeric,
  cod505_left numeric,
  total_distance numeric,
  hsr numeric,
  sprint_distance numeric,
  accelerations numeric,
  decelerations numeric,
  sprints numeric,
  hmld numeric,
  custom_test_values jsonb,
  custom_gps_values jsonb,
  ts bigint,
  unique (team_id, username, date)
);
alter table physical_entries enable row level security;
create policy "public all physical_entries" on physical_entries using (true) with check (true);

-- Player profiles (personal data)
create table if not exists player_profiles (
  id bigserial primary key,
  team_id text not null,
  username text not null,
  display_name text,
  photo_url text,
  birth_date text,
  height numeric,
  position text,
  dominant_leg text,
  dominant_arm text,
  ts bigint,
  unique (team_id, username)
);
alter table player_profiles enable row level security;
create policy "public all player_profiles" on player_profiles using (true) with check (true);

-- Weight entries
create table if not exists weight_entries (
  id bigserial primary key,
  team_id text not null,
  username text not null,
  date text not null,
  weight numeric not null,
  unique (team_id, username, date)
);
alter table weight_entries enable row level security;
create policy "public all weight_entries" on weight_entries using (true) with check (true);

-- Reminder settings
create table if not exists reminder_settings (
  username text primary key,
  wellness_enabled boolean default false,
  wellness_time text default '09:00',
  rpe_enabled boolean default false,
  rpe_time text default '18:00'
);
alter table reminder_settings enable row level security;
create policy "public all reminder_settings" on reminder_settings using (true) with check (true);
