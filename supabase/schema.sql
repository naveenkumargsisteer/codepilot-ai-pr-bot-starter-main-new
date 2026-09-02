-- Run this in Supabase SQL Editor.
create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'github',
  owner text not null,
  name text not null,
  default_branch text not null default 'main',
  installation_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  repository_id uuid references public.repositories(id) on delete cascade,
  prompt text not null,
  status text not null default 'planning',
  plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pull_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  provider_pr_id text,
  branch text,
  commit_sha text,
  url text,
  status text default 'open',
  created_at timestamptz not null default now()
);

alter table public.repositories enable row level security;
alter table public.tasks enable row level security;
alter table public.pull_requests enable row level security;

-- Add authenticated-user policies after wiring Supabase Auth.
-- Do NOT expose service-role keys in the browser.