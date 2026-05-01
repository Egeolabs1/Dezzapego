-- Featured ads payments and internal site analytics.
-- Apply this file in Supabase SQL editor or via your migration workflow.

alter table public.ads
  add column if not exists featured_expires_at timestamptz;

create index if not exists idx_ads_featured_expires_at
  on public.ads(featured_expires_at);

create table if not exists public.featured_plans (
  id text primary key,
  name text not null,
  duration_days integer not null check (duration_days in (7, 15, 30)),
  price_cents integer not null check (price_cents >= 1000),
  currency text not null default 'BRL',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.featured_payments (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.featured_plans(id),
  provider text not null check (provider in ('stripe', 'pixgo')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'refunded', 'failed')),
  amount_cents integer not null check (amount_cents >= 0),
  gross_amount_cents integer not null default 0 check (gross_amount_cents >= 0),
  net_amount_cents integer not null default 0 check (net_amount_cents >= 0),
  fee_amount_cents integer not null default 0 check (fee_amount_cents >= 0),
  currency text not null default 'BRL',
  external_id text,
  external_checkout_id text,
  checkout_url text,
  qr_code text,
  qr_image_url text,
  provider_payload jsonb,
  webhook_payload jsonb,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_featured_plans_active
  on public.featured_plans(active, sort_order);
create index if not exists idx_featured_payments_status
  on public.featured_payments(status);
create index if not exists idx_featured_payments_provider
  on public.featured_payments(provider);
create index if not exists idx_featured_payments_ad_id
  on public.featured_payments(ad_id);
create index if not exists idx_featured_payments_user_id
  on public.featured_payments(user_id);
create index if not exists idx_featured_payments_created_at
  on public.featured_payments(created_at desc);
create index if not exists idx_featured_payments_external_id
  on public.featured_payments(provider, external_id);
create index if not exists idx_site_visits_created_at
  on public.site_visits(created_at desc);
create index if not exists idx_site_visits_path
  on public.site_visits(path);
create index if not exists idx_site_visits_session_created_at
  on public.site_visits(session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_featured_plans_updated_at on public.featured_plans;
create trigger trg_featured_plans_updated_at
  before update on public.featured_plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_featured_payments_updated_at on public.featured_payments;
create trigger trg_featured_payments_updated_at
  before update on public.featured_payments
  for each row execute function public.set_updated_at();

create or replace function public.activate_featured_ad(p_payment_id uuid)
returns table(ad_id uuid, featured_expires_at timestamptz)
language plpgsql
security invoker
as $$
declare
  v_payment public.featured_payments%rowtype;
  v_duration_days integer;
  v_current_expires_at timestamptz;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  select *
  into v_payment
  from public.featured_payments
  where id = p_payment_id;

  if not found then
    raise exception 'featured payment not found: %', p_payment_id;
  end if;

  select duration_days
  into v_duration_days
  from public.featured_plans
  where id = v_payment.plan_id;

  if v_duration_days is null then
    raise exception 'featured plan not found: %', v_payment.plan_id;
  end if;

  select ads.featured_expires_at
  into v_current_expires_at
  from public.ads
  where ads.id = v_payment.ad_id;

  v_starts_at := greatest(coalesce(v_current_expires_at, now()), now());
  v_expires_at := v_starts_at + make_interval(days => v_duration_days);

  update public.featured_payments
  set status = 'paid',
      paid_at = coalesce(paid_at, now()),
      expires_at = v_expires_at
  where id = p_payment_id;

  update public.ads
  set featured = true,
      featured_expires_at = v_expires_at
  where id = v_payment.ad_id;

  ad_id := v_payment.ad_id;
  featured_expires_at := v_expires_at;
  return next;
end;
$$;

revoke execute on function public.activate_featured_ad(uuid) from public, anon, authenticated;

insert into public.featured_plans (id, name, duration_days, price_cents, currency, active, sort_order)
values
  ('featured_7', 'Destaque 7 dias', 7, 1000, 'BRL', true, 1),
  ('featured_15', 'Destaque 15 dias', 15, 1800, 'BRL', true, 2),
  ('featured_30', 'Destaque 30 dias', 30, 3000, 'BRL', true, 3)
on conflict (id) do update set
  name = excluded.name,
  duration_days = excluded.duration_days,
  currency = excluded.currency,
  sort_order = excluded.sort_order;

alter table public.featured_plans enable row level security;
alter table public.featured_payments enable row level security;
alter table public.site_visits enable row level security;

drop policy if exists "Anyone can view active featured plans" on public.featured_plans;
create policy "Anyone can view active featured plans"
  on public.featured_plans for select
  using (active = true or public.is_admin());

drop policy if exists "Admins can manage featured plans" on public.featured_plans;
create policy "Admins can manage featured plans"
  on public.featured_plans for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can view own featured payments" on public.featured_payments;
create policy "Users can view own featured payments"
  on public.featured_payments for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can manage featured payments" on public.featured_payments;
create policy "Admins can manage featured payments"
  on public.featured_payments for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can view site visits" on public.site_visits;
create policy "Admins can view site visits"
  on public.site_visits for select
  using (public.is_admin());

grant select on public.featured_plans to anon, authenticated;
grant select on public.featured_payments to authenticated;
grant select on public.site_visits to authenticated;

comment on table public.featured_plans is 'Configurable featured ad plans sold to advertisers.';
comment on table public.featured_payments is 'Payment records for featured ad purchases via Stripe or PixGo.';
comment on table public.site_visits is 'Internal page visit events tracked server-side for admin analytics.';
