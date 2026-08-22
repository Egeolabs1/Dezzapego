create table if not exists public.email_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  kind text not null check (kind in ('payment_pending', 'payment_paid', 'payment_expired', 'payment_refunded', 'payment_expiring', 'draft_reminder', 'ad_moderation')),
  reference_id uuid,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, reference_id)
);

alter table public.profiles
  add column if not exists email_reminders_enabled boolean not null default true;

create index if not exists email_reminders_due_idx
  on public.email_reminders (status, scheduled_for);

alter table public.email_reminders enable row level security;

create policy "Users can view their own email reminders"
  on public.email_reminders for select to authenticated
  using ((select auth.uid()) = user_id);
