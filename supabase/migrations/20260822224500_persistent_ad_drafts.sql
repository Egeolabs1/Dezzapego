create table if not exists public.ad_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  step integer not null default 0,
  form_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ad_drafts enable row level security;
create policy "Users manage their own ad draft" on public.ad_drafts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
