-- =============================================================================
-- Dezzapego — schema Supabase consolidado (um único arquivo)
-- ----------------------------------------------------------------------------
-- Rode no SQL Editor do Supabase (idealmente projeto vazio ou após backup).
-- Pré-requisito: tabela public.ads já existe (estrutura do app + colunas UUID).
--
-- Idempotência:
--   • Tabelas/colunas/índices: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
--   • Políticas RLS: função create_policy_if_missing() — não recria se o nome já existir
--   • FKs: DROP IF EXISTS + ADD; se ainda assim der duplicado, o bloco DO ignora
--   • Funções: CREATE OR REPLACE
--   • Triggers: função create_trigger_if_missing() — só cria se o nome não existir na tabela
-- Blocos marcados ⚠ no apêndice são opcionais ou destructivos — leia antes.
--
-- Índice: 1 Perfis • 2 is_admin • 3 Trigger signup • 4 Colunas ads • 5 Geo
--         • 6 Favoritos/Denúncias • 7 Contatos • 8 Config sistema
--         • 9 Monetização/feature + analytics • 10 RLS ads + FK delete
--         • 11 RPC apagar conta • 12 Segurança extra (audit/banners/notificações)
--         • APÊNDICE verificação e scripts manuais
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: criar política RLS só se ainda não existir (pula sem erro)
-- ---------------------------------------------------------------------------

create or replace function public.create_policy_if_missing(
  p_schema text,
  p_table text,
  p_policy_name text,
  p_sql text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = p_schema
      and tablename = p_table
      and policyname = p_policy_name
  ) then
    raise notice 'Política "%" em %.% já existe — pulando.', p_policy_name, p_schema, p_table;
    return;
  end if;
  execute p_sql;
end;
$$;

comment on function public.create_policy_if_missing(text, text, text, text) is
  'Usado pelo script consolidado Dezzapego: aplica CREATE POLICY só se o nome não existir.';


create or replace function public.create_trigger_if_missing(
  p_schema text,
  p_table text,
  p_trigger_name text,
  p_sql text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = p_schema
      and c.relname = p_table
      and t.tgname = p_trigger_name
  ) then
    raise notice 'Trigger "%" em %.% já existe — pulando.', p_trigger_name, p_schema, p_table;
    return;
  end if;
  execute p_sql;
end;
$$;

comment on function public.create_trigger_if_missing(text, text, text, text) is
  'Script Dezzapego: executa CREATE TRIGGER só se o gatilho ainda não existir na relação.';


-- ---------------------------------------------------------------------------
-- 1. PERFIS — tabela base + campos extras
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  phone text,
  email text,
  bio text,
  rating numeric default 0,
  verified boolean default false,
  verification_status text default 'none',
  verification_docs jsonb,
  role text default 'user',
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'Dados públicos do usuário.';

alter table public.profiles
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists reserved_username text,
  add column if not exists website text,
  add column if not exists instagram text,
  add column if not exists cpf_cnpj text;

alter table public.profiles
  add column if not exists verification_rejection_reason text;

comment on column public.profiles.verification_rejection_reason is
  'Motivo exibido ao usuário quando a verificação de identidade é recusada.';

alter table public.profiles
  add column if not exists is_suspended boolean default false,
  add column if not exists suspended_reason text;

comment on column public.profiles.is_suspended is
  'Quando true, o titular não pode inserir/atualizar/apagar próprios anúncios (RLS) e o app encerra a sessão.';
comment on column public.profiles.suspended_reason is
  'Motivo da suspensão (pode ser exibido ao usuário após logout).';

alter table public.profiles
  add column if not exists signup_ip text,
  add column if not exists last_access_ip text,
  add column if not exists last_access_at timestamptz;

comment on column public.profiles.signup_ip is
  'IPv4/IPv6 público informado pelo cliente na conclusão do cadastro ou no primeiro login (aprox.).';
comment on column public.profiles.last_access_ip is
  'Último IPv4/IPv6 público informado pelo cliente em acesso à plataforma.';
comment on column public.profiles.last_access_at is
  'Último registro de atividade/IP reportado pelo app.';

alter table public.profiles enable row level security;

select public.create_policy_if_missing(
  'public', 'profiles', 'Public profiles are viewable by everyone.',
  $pol$create policy "Public profiles are viewable by everyone."
    on public.profiles for select using (true)$pol$
);

select public.create_policy_if_missing(
  'public', 'profiles', 'Users can insert their own profile.',
  $pol$create policy "Users can insert their own profile."
    on public.profiles for insert with check (auth.uid() = id)$pol$
);

select public.create_policy_if_missing(
  'public', 'profiles', 'Users can update own profile.',
  $pol$create policy "Users can update own profile."
    on public.profiles for update using (auth.uid() = id)$pol$
);


-- ---------------------------------------------------------------------------
-- 2. Função is_admin() — necessária para várias políticas abaixo
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (is_admin = true or role = 'admin')
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

select public.create_policy_if_missing(
  'public', 'profiles', 'Admins can update any profile',
  $pol$create policy "Admins can update any profile"
    on public.profiles for update
    using (public.is_admin())
    with check (public.is_admin())$pol$
);


-- ---------------------------------------------------------------------------
-- 3. Trigger: criar profile ao registrar no Auth
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$;

select public.create_trigger_if_missing(
  'auth', 'users', 'on_auth_user_created',
  $trg$create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user()$trg$
);


-- ---------------------------------------------------------------------------
-- 3b. IP de cadastro e registro de acesso (titular autenticado)
-- ---------------------------------------------------------------------------

create or replace function public.record_my_signup_meta(p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := trim(coalesce(p_ip, ''));
  v_ip text := left(nullif(trim(coalesce(v_raw, '')), ''), 64);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set
    signup_ip = coalesce(signup_ip, v_ip),
    updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.record_my_access(p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := trim(coalesce(p_ip, ''));
  v_ip text := left(nullif(v_raw, ''), 64);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set
    last_access_ip = case when v_ip is null then last_access_ip else v_ip end,
    last_access_at = now(),
    updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.record_my_signup_meta(text) to authenticated;
grant execute on function public.record_my_access(text) to authenticated;


-- ---------------------------------------------------------------------------
-- 4. Ads — colunas usadas pela aplicação
-- ---------------------------------------------------------------------------

alter table public.ads add column if not exists user_id uuid references auth.users(id);

alter table public.ads
  add column if not exists details jsonb default '{}'::jsonb;

alter table public.ads
  add column if not exists location jsonb default '{}'::jsonb;

alter table public.ads
  add column if not exists status text default 'active';

alter table public.ads
  add column if not exists featured boolean default false;

alter table public.ads add column if not exists lat float;
alter table public.ads add column if not exists lng float;

alter table public.ads add column if not exists featured_expires_at timestamptz;

create index if not exists idx_ads_featured_expires_at on public.ads(featured_expires_at);
create index if not exists ads_lat_lng_idx on public.ads (lat, lng);


-- ---------------------------------------------------------------------------
-- 5. Geo — anúncios próximos
-- ---------------------------------------------------------------------------

create or replace function public.get_nearby_ads(
  user_lat float,
  user_lng float,
  radius_km float
)
returns table (id uuid, lat float, lng float, dist_km float)
language sql
security invoker
set search_path = public
as $$
  select
    a.id,
    a.lat,
    a.lng,
    (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(a.lat)) * cos(radians(a.lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(a.lat))
      )
    ) as dist_km
  from public.ads a
  where
    a.lat is not null and a.lng is not null
    and (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(a.lat)) * cos(radians(a.lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(a.lat))
      )
    ) < radius_km;
$$;


-- ---------------------------------------------------------------------------
-- 6. Favoritos e denúncias
-- ---------------------------------------------------------------------------

create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  ad_id uuid references public.ads not null,
  created_at timestamptz default now(),
  unique(user_id, ad_id)
);

alter table public.favorites enable row level security;

select public.create_policy_if_missing(
  'public', 'favorites', 'Users can view their own favorites',
  $pol$create policy "Users can view their own favorites"
    on public.favorites for select using (auth.uid() = user_id)$pol$
);

select public.create_policy_if_missing(
  'public', 'favorites', 'Users can insert their own favorites',
  $pol$create policy "Users can insert their own favorites"
    on public.favorites for insert with check (auth.uid() = user_id)$pol$
);

select public.create_policy_if_missing(
  'public', 'favorites', 'Users can delete their own favorites',
  $pol$create policy "Users can delete their own favorites"
    on public.favorites for delete using (auth.uid() = user_id)$pol$
);


create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  ad_id uuid references public.ads not null,
  user_id uuid references auth.users,
  reason text not null,
  description text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

select public.create_policy_if_missing(
  'public', 'reports', 'Everyone can insert reports',
  $pol$create policy "Everyone can insert reports"
    on public.reports for insert with check (true)$pol$
);

select public.create_policy_if_missing(
  'public', 'reports', 'No public read access',
  $pol$create policy "No public read access"
    on public.reports for select using (false)$pol$
);


-- ---------------------------------------------------------------------------
-- 7. Mensagens de contato
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  user_id uuid references auth.users(id),
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.contacts enable row level security;

select public.create_policy_if_missing(
  'public', 'contacts', 'Anyone can insert contacts',
  $pol$create policy "Anyone can insert contacts"
    on public.contacts for insert with check (true)$pol$
);

select public.create_policy_if_missing(
  'public', 'contacts', 'Admins can view contacts',
  $pol$create policy "Admins can view contacts"
    on public.contacts for select using (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'contacts', 'Admins can update contacts',
  $pol$create policy "Admins can update contacts"
    on public.contacts for update using (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'contacts', 'Admins can delete contacts',
  $pol$create policy "Admins can delete contacts"
    on public.contacts for delete using (public.is_admin())$pol$
);

grant insert on public.contacts to anon, authenticated;
grant select, update, delete on public.contacts to service_role;
grant select, update on public.contacts to authenticated;


-- ---------------------------------------------------------------------------
-- 8. Configurações do sistema (modo manutenção etc.)
-- ---------------------------------------------------------------------------

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.system_settings enable row level security;

select public.create_policy_if_missing(
  'public', 'system_settings', 'Enable read access for all users',
  $pol$create policy "Enable read access for all users"
    on public.system_settings for select using (true)$pol$
);

select public.create_policy_if_missing(
  'public', 'system_settings', 'Enable insert/update for authenticated users only',
  $pol$create policy "Enable insert/update for authenticated users only"
    on public.system_settings for all to authenticated using (true) with check (true)$pol$
);

insert into public.system_settings (key, value)
values ('maintenance_mode', 'false'::jsonb)
on conflict (key) do nothing;


-- ---------------------------------------------------------------------------
-- 9. Monetização (destaque) + analytics de página
-- ---------------------------------------------------------------------------

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
create index if not exists idx_featured_payments_ad_id on public.featured_payments(ad_id);
create index if not exists idx_featured_payments_user_id on public.featured_payments(user_id);
create index if not exists idx_featured_payments_created_at on public.featured_payments(created_at desc);
create index if not exists idx_featured_payments_external_id on public.featured_payments(provider, external_id);
create index if not exists idx_site_visits_created_at on public.site_visits(created_at desc);
create index if not exists idx_site_visits_path on public.site_visits(path);
create index if not exists idx_site_visits_session_created_at on public.site_visits(session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

select public.create_trigger_if_missing(
  'public', 'featured_plans', 'trg_featured_plans_updated_at',
  $trg$create trigger trg_featured_plans_updated_at
    before update on public.featured_plans
    for each row execute function public.set_updated_at()$trg$
);

select public.create_trigger_if_missing(
  'public', 'featured_payments', 'trg_featured_payments_updated_at',
  $trg$create trigger trg_featured_payments_updated_at
    before update on public.featured_payments
    for each row execute function public.set_updated_at()$trg$
);

create or replace function public.activate_featured_ad(p_payment_id uuid)
returns table(ad_id uuid, featured_expires_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.featured_payments%rowtype;
  v_duration_days integer;
  v_current_expires_at timestamptz;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  select * into v_payment from public.featured_payments where id = p_payment_id;
  if not found then raise exception 'featured payment not found: %', p_payment_id;
  end if;

  select fp.duration_days into v_duration_days
  from public.featured_plans fp where fp.id = v_payment.plan_id;
  if v_duration_days is null then raise exception 'featured plan not found: %', v_payment.plan_id;
  end if;

  select ads.featured_expires_at into v_current_expires_at from public.ads where ads.id = v_payment.ad_id;

  v_starts_at := greatest(coalesce(v_current_expires_at, now()), now());
  v_expires_at := v_starts_at + make_interval(days => v_duration_days);

  update public.featured_payments
  set status = 'paid',
      paid_at = coalesce(paid_at, now()),
      expires_at = v_expires_at
  where id = p_payment_id;

  update public.ads
  set featured = true, featured_expires_at = v_expires_at
  where id = v_payment.ad_id;

  ad_id := v_payment.ad_id;
  featured_expires_at := v_expires_at;
  return next;
end;
$$;

do $rev_feat$
begin
  revoke execute on function public.activate_featured_ad(uuid) from public;
  revoke execute on function public.activate_featured_ad(uuid) from anon;
  revoke execute on function public.activate_featured_ad(uuid) from authenticated;
exception
  when undefined_object then null;
  when invalid_grant_operation then null;
end $rev_feat$;

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

select public.create_policy_if_missing(
  'public', 'featured_plans', 'Anyone can view active featured plans',
  $pol$create policy "Anyone can view active featured plans"
    on public.featured_plans for select using (active = true or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'featured_plans', 'Admins can manage featured plans',
  $pol$create policy "Admins can manage featured plans"
    on public.featured_plans for all using (public.is_admin()) with check (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'featured_payments', 'Users can view own featured payments',
  $pol$create policy "Users can view own featured payments"
    on public.featured_payments for select using (auth.uid() = user_id or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'featured_payments', 'Admins can manage featured payments',
  $pol$create policy "Admins can manage featured payments"
    on public.featured_payments for all using (public.is_admin()) with check (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'site_visits', 'Admins can view site visits',
  $pol$create policy "Admins can view site visits"
    on public.site_visits for select using (public.is_admin())$pol$
);

grant select on public.featured_plans to anon, authenticated;
grant select on public.featured_payments to authenticated;
grant select on public.site_visits to authenticated;

comment on table public.featured_plans is 'Planos configuráveis de destaque pago.';
comment on table public.featured_payments is 'Pagamentos de destaque (Stripe ou PixGo).';
comment on table public.site_visits is 'Analytics interna de página (gravação via service role em API).';


-- ---------------------------------------------------------------------------
-- 10. RLS em ads + FK com CASCADE ao apagar anúncio + delete admin
-- ---------------------------------------------------------------------------

alter table public.ads enable row level security;

select public.create_policy_if_missing(
  'public', 'ads', 'Ads are viewable by everyone',
  $pol$create policy "Ads are viewable by everyone"
    on public.ads for select using (true)$pol$
);

-- Migração LGPD suspensão: políticas de escrita do próprio usuário em ads
-- (create_policy_if_missing não atualiza políticas existentes — DROP + CREATE idempotente)
drop policy if exists "Users can insert their own ads" on public.ads;
create policy "Users can insert their own ads"
  on public.ads for insert to authenticated
  with check (
    auth.uid() = user_id
    and not coalesce(
      (select p.is_suspended from public.profiles p where p.id = auth.uid()),
      false
    )
  );

drop policy if exists "Users can update their own ads" on public.ads;
create policy "Users can update their own ads"
  on public.ads for update
  using (
    auth.uid() = user_id
    and not coalesce(
      (select p.is_suspended from public.profiles p where p.id = auth.uid()),
      false
    )
  );

drop policy if exists "Users can delete their own ads" on public.ads;
create policy "Users can delete their own ads"
  on public.ads for delete
  using (
    auth.uid() = user_id
    and not coalesce(
      (select p.is_suspended from public.profiles p where p.id = auth.uid()),
      false
    )
  );

select public.create_policy_if_missing(
  'public', 'ads', 'Admins can delete any ad',
  $pol$create policy "Admins can delete any ad"
    on public.ads for delete using (public.is_admin())$pol$
);

-- FK + cascade (duplicados ignorados)
do $fk_favorites$
begin
  alter table public.favorites drop constraint if exists favorites_ad_id_fkey;
  alter table public.favorites add constraint favorites_ad_id_fkey
    foreign key (ad_id) references public.ads(id) on delete cascade;
exception
  when duplicate_object then
    raise notice 'FK favorites_ad_id_fkey já existia — pulando.';
end $fk_favorites$;

do $fk_reports$
begin
  alter table public.reports drop constraint if exists reports_ad_id_fkey;
  alter table public.reports add constraint reports_ad_id_fkey
    foreign key (ad_id) references public.ads(id) on delete cascade;
exception
  when duplicate_object then
    raise notice 'FK reports_ad_id_fkey já existia — pulando.';
end $fk_reports$;

do $fk_optional$
begin
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='ad_id') then
      begin
        execute 'alter table public.notifications drop constraint if exists notifications_ad_id_fkey';
        execute 'alter table public.notifications add constraint notifications_ad_id_fkey foreign key (ad_id) references public.ads(id) on delete cascade';
      exception when duplicate_object then
        raise notice 'FK notifications_ad_id_fkey — pulando (já existe).';
      end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='ad_id') then
      begin
        execute 'alter table public.messages drop constraint if exists messages_ad_id_fkey';
        execute 'alter table public.messages add constraint messages_ad_id_fkey foreign key (ad_id) references public.ads(id) on delete cascade';
      exception when duplicate_object then
        raise notice 'FK messages_ad_id_fkey — pulando (já existe).';
      end;
    end if;
end $fk_optional$;


-- ---------------------------------------------------------------------------
-- 11. RPC: usuário apaga a própria conta
-- ---------------------------------------------------------------------------

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = current_user_id;
end;
$$;

grant execute on function delete_own_account() to authenticated;


-- ---------------------------------------------------------------------------
-- 12. Tabelas admin (somente se existirem): audit_logs, banners, notifications
-- ---------------------------------------------------------------------------

do $admin_rls$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_logs') then
    alter table public.audit_logs enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'Admins can read audit logs') then
      create policy "Admins can read audit logs" on public.audit_logs for select to authenticated
        using ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin');
    else
      raise notice 'Política audit_logs Admins can read audit logs já existe — pulando.';
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'Enable insert for authenticated users audit') then
      create policy "Enable insert for authenticated users audit" on public.audit_logs for insert to authenticated with check (true);
    else
      raise notice 'Política audit_logs Enable insert ... audit já existe — pulando.';
    end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'banners') then
    alter table public.banners enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'banners' and policyname = 'Public read access for banners') then
      create policy "Public read access for banners" on public.banners for select to public using (true);
    else raise notice 'Política banners leitura pública já existe — pulando.'; end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'banners' and policyname = 'Admins can manage banners') then
      create policy "Admins can manage banners" on public.banners for all to authenticated
        using ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin')
        with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'admin');
    else raise notice 'Política banners admin já existe — pulando.'; end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'notifications') then
    alter table public.notifications enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can view own notifications') then
      create policy "Users can view own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
    else raise notice 'Política notifications view já existe — pulando.'; end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can update own notifications') then
      create policy "Users can update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id);
    else raise notice 'Política notifications update já existe — pulando.'; end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Enable insert for authenticated users notifications') then
      create policy "Enable insert for authenticated users notifications" on public.notifications for insert to authenticated with check (true);
    else raise notice 'Política notifications insert já existe — pulando.'; end if;
  end if;
end $admin_rls$;

do $fix_search$
begin
  begin
    alter function public.get_nearby_ads(double precision, double precision, double precision) set search_path = public;
  exception when others then raise notice 'get_nearby_ads search_path: %', sqlerrm;
  end;
  begin
    alter function public.is_admin() set search_path = public;
  exception when others then raise notice 'is_admin search_path: %', sqlerrm;
  end;
end $fix_search$;


-- =============================================================================
-- APÊNDICE — use manualmente quando fizer sentido
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Backfill: criar perfis para usuários do Auth sem linha em public.profiles
-- ---------------------------------------------------------------------------
-- insert into public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
-- select id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url',
--        created_at, coalesce(last_sign_in_at, created_at)
-- from auth.users
-- on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- B) Promover usuário a admin — substituir pelo e-mail correto e descomente
-- ---------------------------------------------------------------------------
-- update public.profiles set is_admin = true, role = 'admin'
-- where id = (select id from auth.users where email = 'seu@email.com' limit 1);

-- ---------------------------------------------------------------------------
-- C) Verificação (somente SELECT — diagnosticar políticas / RLS)
-- ---------------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables where schemaname='public'
-- and tablename in ('ads','profiles','favorites','reports','messages','notifications');
-- select * from pg_policies where tablename = 'ads';

-- ---------------------------------------------------------------------------
-- D) Storage — buckets (rode no projeto para auditoria manual)
-- ---------------------------------------------------------------------------
-- select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;

-- ---------------------------------------------------------------------------
-- ⚠ E) DESTRUTIVO: apagar TODOS os anúncios (cascade em favoritos, denúncias, etc.)
-- ---------------------------------------------------------------------------
-- delete from public.ads;
