-- 0000_initial_schema.sql
-- Foundational schema prerequisites: extensions, core multi-tenant tables, and platform config defaults

create extension if not exists vector;

create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  plan text not null default 'trial',
  status text not null default 'active',
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references institutions(id) not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  full_name text not null,
  created_at timestamptz default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) not null,
  name text not null,
  block text,
  floor text
);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) not null,
  created_at timestamptz default now()
);

create table if not exists capture_jobs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) not null,
  session_id uuid references class_sessions(id) not null,
  camera_id uuid,
  run_at timestamptz not null,
  status text not null default 'pending'
);

create table if not exists attendance_observations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) not null,
  session_id uuid references class_sessions(id) not null,
  student_id uuid,
  captured_at timestamptz not null,
  similarity_score float,
  quality_score float,
  match_status text not null default 'uncertain',
  model_version text default 'dlib_resnet_v1'
);

create table if not exists attendance_config (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id),
  match_threshold float default 0.6,
  present_threshold float default 0.75,
  left_early_threshold float default 0.5,
  min_valid_observations int default 3,
  max_gap_minutes int default 15,
  quorum_fraction float default 0.4,
  min_quorum_count int default 3,
  capture_buffer_minutes int default 5,
  dispute_window_hours int default 48,
  is_active boolean default true
);

-- Platform-wide fallback configuration row (institution_id is NULL)
insert into attendance_config (
  institution_id,
  match_threshold,
  present_threshold,
  left_early_threshold,
  min_valid_observations,
  max_gap_minutes,
  quorum_fraction,
  min_quorum_count,
  capture_buffer_minutes,
  dispute_window_hours,
  is_active
)
values (null, 0.6, 0.75, 0.5, 3, 15, 0.4, 3, 5, 48, true);
