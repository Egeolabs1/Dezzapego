create table if not exists public.saved_search_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  label text not null check (char_length(label) between 1 and 120),
  search_url text not null check (char_length(search_url) between 1 and 2048),
  filters jsonb not null default '{}'::jsonb,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  is_active boolean not null default true,
  last_checked_at timestamptz not null default now(),
  last_notified_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, search_url)
);

create index if not exists saved_search_alerts_due_idx
  on public.saved_search_alerts (is_active, last_checked_at);

alter table public.saved_search_alerts enable row level security;
revoke all on public.saved_search_alerts from anon, authenticated;
grant all on public.saved_search_alerts to service_role;
