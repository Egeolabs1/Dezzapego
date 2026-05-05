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
  add column if not exists cpf_cnpj text,
  add column if not exists account_type text default 'personal',
  add column if not exists business_name text,
  add column if not exists responsible_name text;

alter table public.profiles
  add column if not exists verification_rejection_reason text;

do $profile_account_type_check$
begin
  alter table public.profiles drop constraint if exists profiles_account_type_check;
  alter table public.profiles add constraint profiles_account_type_check
    check (account_type in ('personal', 'professional'));
end $profile_account_type_check$;

do $profile_verification_status_check$
begin
  alter table public.profiles drop constraint if exists profiles_verification_status_check;
  alter table public.profiles add constraint profiles_verification_status_check
    check (verification_status in ('none', 'pending', 'verified', 'rejected'));
end $profile_verification_status_check$;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(trim(email)))
  where nullif(trim(email), '') is not null;

create unique index if not exists profiles_phone_digits_unique_idx
  on public.profiles (regexp_replace(phone, '\D', '', 'g'))
  where nullif(regexp_replace(phone, '\D', '', 'g'), '') is not null;

create unique index if not exists profiles_cpf_cnpj_digits_unique_idx
  on public.profiles (regexp_replace(cpf_cnpj, '\D', '', 'g'))
  where nullif(regexp_replace(cpf_cnpj, '\D', '', 'g'), '') is not null;

comment on column public.profiles.verification_rejection_reason is
  'Motivo exibido ao usuário quando a verificação de identidade é recusada.';
comment on column public.profiles.account_type is
  'Tipo de conta escolhido no cadastro: personal ou professional.';
comment on column public.profiles.business_name is
  'Nome comercial usado por conta profissional/loja.';
comment on column public.profiles.responsible_name is
  'Pessoa responsável pela conta profissional/loja.';

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

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

select public.create_policy_if_missing(
  'public', 'profiles', 'Users can view own profile.',
  $pol$create policy "Users can view own profile."
    on public.profiles for select to authenticated using (auth.uid() = id)$pol$
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

revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

select public.create_policy_if_missing(
  'public', 'profiles', 'Admins can update any profile',
  $pol$create policy "Admins can update any profile"
    on public.profiles for update
    using (public.is_admin())
    with check (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'profiles', 'Admins can view any profile',
  $pol$create policy "Admins can view any profile"
    on public.profiles for select to authenticated
    using (public.is_admin())$pol$
);

create or replace function public.get_public_profiles(p_ids uuid[])
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  state text,
  website text,
  instagram text,
  rating numeric,
  verified boolean,
  created_at timestamptz,
  account_type text,
  business_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.state,
    p.website,
    p.instagram,
    p.rating,
    p.verified,
    p.created_at,
    p.account_type,
    p.business_name
  from public.profiles p
  where p.id = any(coalesce(p_ids, array[]::uuid[]))
    and coalesce(p.is_suspended, false) = false
  limit 100;
$$;

create or replace function public.profile_identity_exists(p_phone text, p_cpf_cnpj text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where (
      nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '') is not null
      and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    )
    or (
      nullif(regexp_replace(coalesce(p_cpf_cnpj, ''), '\D', '', 'g'), '') is not null
      and regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf_cnpj, ''), '\D', '', 'g')
    )
  );
$$;

revoke execute on function public.get_public_profiles(uuid[]) from public;
grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;
revoke execute on function public.profile_identity_exists(text, text) from public;
grant execute on function public.profile_identity_exists(text, text) to anon, authenticated;

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if current_setting('dezzapego.allow_profile_verification_request', true) = 'on' then
    if old.role is not distinct from new.role
      and old.is_admin is not distinct from new.is_admin
      and old.rating is not distinct from new.rating
      and old.is_suspended is not distinct from new.is_suspended
      and old.suspended_reason is not distinct from new.suspended_reason
      and new.verification_status = 'pending'
      and new.verified = false
      and new.verification_docs is not null
      and new.verification_rejection_reason is null then
      return new;
    end if;
  end if;

  if old.role is distinct from new.role
    or old.is_admin is distinct from new.is_admin
    or old.verified is distinct from new.verified
    or old.verification_status is distinct from new.verification_status
    or old.verification_docs is distinct from new.verification_docs
    or old.verification_rejection_reason is distinct from new.verification_rejection_reason
    or old.rating is distinct from new.rating
    or old.is_suspended is distinct from new.is_suspended
    or old.suspended_reason is distinct from new.suspended_reason then
    raise exception 'not allowed to update protected profile fields';
  end if;

  return new;
end;
$$;

select public.create_trigger_if_missing(
  'public', 'profiles', 'protect_profile_sensitive_fields',
  $trg$create trigger protect_profile_sensitive_fields
    before update on public.profiles
    for each row execute function public.protect_profile_sensitive_fields()$trg$
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
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    email,
    phone,
    cpf_cnpj,
    account_type,
    business_name,
    responsible_name
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cpf_cnpj', ''), '\D', '', 'g'), ''),
    case
      when new.raw_user_meta_data->>'account_type' = 'professional' then 'professional'
      else 'personal'
    end,
    nullif(trim(coalesce(new.raw_user_meta_data->>'business_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'responsible_name', '')), '')
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
-- 3c. Solicitação segura de verificação pelo titular
-- ---------------------------------------------------------------------------

create or replace function public.request_my_verification(p_docs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if jsonb_typeof(p_docs) is distinct from 'object'
    or jsonb_typeof(p_docs->'doc') is distinct from 'array'
    or jsonb_typeof(p_docs->'selfie') is distinct from 'array'
    or jsonb_array_length(p_docs->'doc') < 1
    or jsonb_array_length(p_docs->'doc') > 2
    or jsonb_array_length(p_docs->'selfie') <> 1 then
    raise exception 'invalid verification documents';
  end if;

  perform set_config('dezzapego.allow_profile_verification_request', 'on', true);

  update public.profiles
  set
    verification_status = 'pending',
    verified = false,
    verification_docs = jsonb_build_object(
      'doc', p_docs->'doc',
      'selfie', p_docs->'selfie'
    ),
    verification_rejection_reason = null,
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke execute on function public.request_my_verification(jsonb) from anon;
grant execute on function public.request_my_verification(jsonb) to authenticated;


-- ---------------------------------------------------------------------------
-- 3d. Administradores iniciais
-- ---------------------------------------------------------------------------

update public.profiles
set
  is_admin = true,
  role = 'admin',
  updated_at = now()
where email in ('ngfilho@gmail.com', 'egeohub101@gmail.com');


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

do $ads_status_check$
begin
  alter table public.ads drop constraint if exists ads_status_check;
  alter table public.ads add constraint ads_status_check
    check (status in ('active', 'paused', 'sold', 'expired', 'deleted'));
end $ads_status_check$;

alter table public.ads
  add column if not exists featured boolean default false;

alter table public.ads add column if not exists lat float;
alter table public.ads add column if not exists lng float;

alter table public.ads add column if not exists featured_expires_at timestamptz;
alter table public.ads add column if not exists created_at timestamptz default now();
alter table public.ads add column if not exists updated_at timestamptz default now();

create index if not exists idx_ads_featured_expires_at on public.ads(featured_expires_at);
create index if not exists ads_lat_lng_idx on public.ads (lat, lng);
create index if not exists idx_ads_created_at on public.ads(created_at desc);
create index if not exists idx_ads_updated_at on public.ads(updated_at desc);

do $remove_seller_phone_snapshot$
declare
  v_seller_udt text;
begin
  select udt_name into v_seller_udt
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ads'
    and column_name = 'seller';

  if v_seller_udt = 'jsonb' then
    execute $sql$
      update public.ads
      set seller = seller - 'phone'
      where jsonb_typeof(seller) = 'object'
        and seller ? 'phone'
    $sql$;
  elsif v_seller_udt = 'json' then
    execute $sql$
      update public.ads
      set seller = (to_jsonb(seller) - 'phone')::json
      where jsonb_typeof(to_jsonb(seller)) = 'object'
        and to_jsonb(seller) ? 'phone'
    $sql$;
  end if;
end $remove_seller_phone_snapshot$;


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

create or replace function public.get_ad_contact_phone(p_ad_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.phone
  from public.ads a
  join public.profiles p on p.id = a.user_id
  where a.id = p_ad_id
    and auth.uid() is not null
    and coalesce(a.status, 'active') = 'active'
    and coalesce(p.is_suspended, false) = false
    and nullif(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), '') is not null
  limit 1;
$$;

revoke execute on function public.get_ad_contact_phone(uuid) from public;
grant execute on function public.get_ad_contact_phone(uuid) to authenticated;


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
  reporter_name text,
  reporter_email text,
  status text default 'pending',
  created_at timestamptz default now()
);

do $reports_status_check$
begin
  alter table public.reports drop constraint if exists reports_status_check;
  alter table public.reports add constraint reports_status_check
    check (status in ('pending', 'reviewed', 'resolved', 'dismissed'));
end $reports_status_check$;

alter table public.reports enable row level security;

select public.create_policy_if_missing(
  'public', 'reports', 'Everyone can insert reports',
  $pol$create policy "Everyone can insert reports"
    on public.reports for insert with check (true)$pol$
);

select public.create_policy_if_missing(
  'public', 'reports', 'Admins can view all reports',
  $pol$create policy "Admins can view all reports"
    on public.reports for select using (public.is_admin())$pol$
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
  'public', 'system_settings', 'Admins can manage system settings',
  $pol$create policy "Admins can manage system settings"
    on public.system_settings for all to authenticated
    using (public.is_admin())
    with check (public.is_admin())$pol$
);

drop policy if exists "Enable insert/update for authenticated users only" on public.system_settings;

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

alter table public.featured_plans drop constraint if exists featured_plans_duration_days_check;
alter table public.featured_plans add constraint featured_plans_duration_days_check check (duration_days > 0);
alter table public.featured_plans add column if not exists description text;
alter table public.featured_plans add column if not exists sort_order integer not null default 0;
alter table public.featured_plans add column if not exists updated_at timestamptz not null default now();

create table if not exists public.account_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL',
  price_label text not null default 'R$ 0',
  period_label text not null default '/mês',
  features text[] not null default '{}',
  button_text text not null default 'Assinar',
  button_link text not null default '/register',
  max_active_ads integer check (max_active_ads is null or max_active_ads >= 0),
  max_photos_per_ad integer not null default 3 check (max_photos_per_ad > 0),
  monthly_featured_ads integer not null default 0 check (monthly_featured_ads >= 0),
  highlighted boolean not null default false,
  icon_name text not null default 'Zap',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_plans add column if not exists price_cents integer not null default 0;
alter table public.account_plans add column if not exists currency text not null default 'BRL';
alter table public.account_plans add column if not exists description text not null default '';
alter table public.account_plans add column if not exists price_label text not null default 'R$ 0';
alter table public.account_plans add column if not exists period_label text not null default '/mês';
alter table public.account_plans add column if not exists features text[] not null default '{}';
alter table public.account_plans add column if not exists button_text text not null default 'Assinar';
alter table public.account_plans add column if not exists button_link text not null default '/register';
alter table public.account_plans add column if not exists max_active_ads integer;
alter table public.account_plans add column if not exists max_photos_per_ad integer not null default 3;
alter table public.account_plans add column if not exists monthly_featured_ads integer not null default 0;
alter table public.account_plans add column if not exists highlighted boolean not null default false;
alter table public.account_plans add column if not exists icon_name text not null default 'Zap';
alter table public.account_plans add column if not exists active boolean not null default true;
alter table public.account_plans add column if not exists sort_order integer not null default 0;
alter table public.account_plans add column if not exists created_at timestamptz not null default now();
alter table public.account_plans add column if not exists updated_at timestamptz not null default now();

do $account_plans_features_type$
declare
  v_udt_name text;
begin
  select udt_name into v_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'account_plans'
    and column_name = 'features';

  if v_udt_name is not null and v_udt_name <> '_text' then
    alter table public.account_plans add column if not exists features_text_tmp text[] default '{}';

    update public.account_plans
    set features_text_tmp = case
      when features is null then '{}'::text[]
      when jsonb_typeof(to_jsonb(features)) = 'array' then
        coalesce((select array_agg(f.value) from jsonb_array_elements_text(to_jsonb(features)) as f(value)), '{}'::text[])
      else array[features::text]
    end;

    alter table public.account_plans drop column features;
    alter table public.account_plans rename column features_text_tmp to features;
    alter table public.account_plans alter column features set default '{}';
  end if;
end $account_plans_features_type$;

update public.account_plans set currency = 'BRL' where currency is null;
update public.account_plans set description = '' where description is null;
update public.account_plans set price_label = 'R$ 0' where price_label is null;
update public.account_plans set period_label = '/mês' where period_label is null;
update public.account_plans set features = '{}' where features is null;
update public.account_plans set button_text = 'Assinar' where button_text is null;
update public.account_plans set button_link = '/register' where button_link is null;
update public.account_plans set max_photos_per_ad = 3 where max_photos_per_ad is null or max_photos_per_ad <= 0;
update public.account_plans set monthly_featured_ads = 0 where monthly_featured_ads is null or monthly_featured_ads < 0;
update public.account_plans set highlighted = false where highlighted is null;
update public.account_plans set icon_name = 'Zap' where icon_name is null;
update public.account_plans set active = true where active is null;
update public.account_plans set sort_order = 0 where sort_order is null;
update public.account_plans set created_at = now() where created_at is null;
update public.account_plans set updated_at = now() where updated_at is null;

alter table public.account_plans alter column price_cents set default 0;
alter table public.account_plans alter column price_cents set not null;
alter table public.account_plans alter column currency set default 'BRL';
alter table public.account_plans alter column currency set not null;
alter table public.account_plans alter column description set default '';
alter table public.account_plans alter column description set not null;
alter table public.account_plans alter column price_label set default 'R$ 0';
alter table public.account_plans alter column price_label set not null;
alter table public.account_plans alter column period_label set default '/mês';
alter table public.account_plans alter column period_label set not null;
alter table public.account_plans alter column features set default '{}';
alter table public.account_plans alter column features set not null;
alter table public.account_plans alter column button_text set default 'Assinar';
alter table public.account_plans alter column button_text set not null;
alter table public.account_plans alter column button_link set default '/register';
alter table public.account_plans alter column button_link set not null;
alter table public.account_plans alter column max_photos_per_ad set default 3;
alter table public.account_plans alter column max_photos_per_ad set not null;
alter table public.account_plans alter column monthly_featured_ads set default 0;
alter table public.account_plans alter column monthly_featured_ads set not null;
alter table public.account_plans alter column highlighted set default false;
alter table public.account_plans alter column highlighted set not null;
alter table public.account_plans alter column icon_name set default 'Zap';
alter table public.account_plans alter column icon_name set not null;
alter table public.account_plans alter column active set default true;
alter table public.account_plans alter column active set not null;
alter table public.account_plans alter column sort_order set default 0;
alter table public.account_plans alter column sort_order set not null;
alter table public.account_plans alter column created_at set default now();
alter table public.account_plans alter column created_at set not null;
alter table public.account_plans alter column updated_at set default now();
alter table public.account_plans alter column updated_at set not null;

notify pgrst, 'reload schema';

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
create index if not exists idx_account_plans_active
  on public.account_plans(active, sort_order);
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
  'public', 'account_plans', 'trg_account_plans_updated_at',
  $trg$create trigger trg_account_plans_updated_at
    before update on public.account_plans
    for each row execute function public.set_updated_at()$trg$
);

select public.create_trigger_if_missing(
  'public', 'ads', 'trg_ads_updated_at',
  $trg$create trigger trg_ads_updated_at
    before update on public.ads
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
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.account_plans (
  id, name, description, price_cents, currency, price_label, period_label, features,
  button_text, button_link, max_active_ads, max_photos_per_ad, monthly_featured_ads,
  highlighted, icon_name, active, sort_order
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Grátis',
    'Para quem está começando a desapegar.',
    0,
    'BRL',
    'R$ 0',
    '/mês',
    array['Até 5 anúncios ativos', '3 fotos por anúncio', 'Chat com compradores', 'Suporte básico'],
    'Começar Grátis',
    '/register',
    5,
    3,
    0,
    false,
    'Zap',
    true,
    0
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Pro',
    'Para quem vende com frequência.',
    2990,
    'BRL',
    'R$ 29,90',
    '/mês',
    array['Até 50 anúncios ativos', '10 fotos por anúncio', 'Destaque em 2 anúncios/mês', 'Suporte prioritário', 'Estatísticas detalhadas'],
    'Assinar Pro',
    '/register?plan=00000000-0000-4000-8000-000000000002',
    50,
    10,
    2,
    true,
    'Star',
    true,
    1
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Empresa',
    'Para lojas e pequenos negócios.',
    8990,
    'BRL',
    'R$ 89,90',
    '/mês',
    array['Anúncios ilimitados', '20 fotos por anúncio', 'Destaque em 10 anúncios/mês', 'Perfil verificado (Selo)', 'Painel de gestão avançado', 'Integração via API (Em breve)'],
    'Falar com Comercial',
    '/contato',
    null,
    20,
    10,
    false,
    'Shield',
    true,
    2
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  price_label = excluded.price_label,
  period_label = excluded.period_label,
  features = excluded.features,
  button_text = excluded.button_text,
  button_link = excluded.button_link,
  max_active_ads = excluded.max_active_ads,
  max_photos_per_ad = excluded.max_photos_per_ad,
  monthly_featured_ads = excluded.monthly_featured_ads,
  highlighted = excluded.highlighted,
  icon_name = excluded.icon_name,
  active = excluded.active,
  sort_order = excluded.sort_order;

alter table public.featured_plans enable row level security;
alter table public.account_plans enable row level security;
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
  'public', 'account_plans', 'Anyone can view active account plans',
  $pol$create policy "Anyone can view active account plans"
    on public.account_plans for select using (active = true or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'account_plans', 'Admins can manage account plans',
  $pol$create policy "Admins can manage account plans"
    on public.account_plans for all using (public.is_admin()) with check (public.is_admin())$pol$
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
grant select on public.account_plans to anon, authenticated;
grant insert, update, delete on public.featured_plans to authenticated;
grant insert, update, delete on public.account_plans to authenticated;
grant select on public.featured_payments to authenticated;
grant select on public.site_visits to authenticated;

comment on table public.featured_plans is 'Planos configuráveis de destaque pago.';
comment on table public.account_plans is 'Planos de conta configuráveis, incluindo limites de anúncios, fotos e destaques mensais.';
comment on table public.featured_payments is 'Pagamentos de destaque (Stripe ou PixGo).';
comment on table public.site_visits is 'Analytics interna de página (gravação via service role em API).';

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- 10. RLS em ads + FK com CASCADE ao apagar anúncio + delete admin
-- ---------------------------------------------------------------------------

alter table public.ads enable row level security;

drop policy if exists "Ads are viewable by everyone" on public.ads;
drop policy if exists "Active ads are viewable by everyone" on public.ads;
drop policy if exists "Users can view their own ads" on public.ads;
drop policy if exists "Admins can view any ad" on public.ads;

create policy "Active ads are viewable by everyone"
  on public.ads for select
  using (coalesce(status, 'active') = 'active');

create policy "Users can view their own ads"
  on public.ads for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view any ad"
  on public.ads for select to authenticated
  using (public.is_admin());

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
  )
  with check (
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
  'public', 'ads', 'Admins can update any ad',
  $pol$create policy "Admins can update any ad"
    on public.ads for update to authenticated
    using (public.is_admin())
    with check (public.is_admin())$pol$
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
-- 12. Tabelas admin: audit_logs, banners, notifications
-- ---------------------------------------------------------------------------

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  mobile_image_url text,
  title text,
  subtitle text,
  cta_label text,
  link text,
  alt_text text,
  placement text not null default 'home_hero',
  active boolean not null default true,
  sort_order integer not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banners_valid_period check (start_at is null or end_at is null or end_at > start_at),
  constraint banners_valid_placement check (placement in ('home_hero', 'home_top', 'category_top'))
);

alter table public.banners add column if not exists mobile_image_url text;
alter table public.banners add column if not exists title text;
alter table public.banners add column if not exists subtitle text;
alter table public.banners add column if not exists cta_label text;
alter table public.banners add column if not exists link text;
alter table public.banners add column if not exists alt_text text;
alter table public.banners add column if not exists placement text not null default 'home_hero';
alter table public.banners add column if not exists active boolean not null default true;
alter table public.banners add column if not exists sort_order integer not null default 0;
alter table public.banners add column if not exists start_at timestamptz;
alter table public.banners add column if not exists end_at timestamptz;
alter table public.banners add column if not exists created_at timestamptz not null default now();
alter table public.banners add column if not exists updated_at timestamptz not null default now();

update public.banners set placement = 'home_hero' where placement is null;
update public.banners
set placement = 'home_hero'
where placement not in ('home_hero', 'home_top', 'category_top');
update public.banners set active = true where active is null;
update public.banners set sort_order = 0 where sort_order is null;
update public.banners set created_at = now() where created_at is null;
update public.banners set updated_at = now() where updated_at is null;

alter table public.banners alter column placement set default 'home_hero';
alter table public.banners alter column placement set not null;
alter table public.banners alter column active set default true;
alter table public.banners alter column active set not null;
alter table public.banners alter column sort_order set default 0;
alter table public.banners alter column sort_order set not null;
alter table public.banners alter column created_at set default now();
alter table public.banners alter column created_at set not null;
alter table public.banners alter column updated_at set default now();
alter table public.banners alter column updated_at set not null;

do $banners_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'banners_valid_period'
      and conrelid = 'public.banners'::regclass
  ) then
    alter table public.banners add constraint banners_valid_period
      check (start_at is null or end_at is null or end_at > start_at);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'banners_valid_placement'
      and conrelid = 'public.banners'::regclass
  ) then
    alter table public.banners add constraint banners_valid_placement
      check (placement in ('home_hero', 'home_top', 'category_top'));
  end if;
end $banners_constraints$;

create index if not exists idx_banners_public_display
  on public.banners(placement, active, sort_order, created_at desc);

create index if not exists idx_banners_schedule
  on public.banners(start_at, end_at)
  where active = true;

select public.create_trigger_if_missing(
  'public', 'banners', 'trg_banners_updated_at',
  $trg$create trigger trg_banners_updated_at
    before update on public.banners
    for each row execute function public.set_updated_at()$trg$
);

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
    drop policy if exists "Enable insert for authenticated users audit" on public.audit_logs;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'Admins can insert audit logs') then
      create policy "Admins can insert audit logs" on public.audit_logs for insert to authenticated
        with check (public.is_admin());
    else
      raise notice 'Política audit_logs Admins can insert audit logs já existe — pulando.';
    end if;
  end if;

  alter table public.banners enable row level security;
  drop policy if exists "Public read access for banners" on public.banners;
  create policy "Public read access for banners" on public.banners for select to public
    using (
      active = true
      and (start_at is null or start_at <= now())
      and (end_at is null or end_at >= now())
    );

  drop policy if exists "Admins can manage banners" on public.banners;
  create policy "Admins can manage banners" on public.banners for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  grant select on public.banners to anon, authenticated;
  grant insert, update, delete on public.banners to authenticated;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'notifications') then
    alter table public.notifications enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can view own notifications') then
      create policy "Users can view own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
    else raise notice 'Política notifications view já existe — pulando.'; end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can update own notifications') then
      create policy "Users can update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id);
    else raise notice 'Política notifications update já existe — pulando.'; end if;
    drop policy if exists "Enable insert for authenticated users notifications" on public.notifications;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Admins can insert notifications') then
      create policy "Admins can insert notifications" on public.notifications for insert to authenticated
        with check (public.is_admin());
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
-- B) Promover usuário a admin manualmente
-- ---------------------------------------------------------------------------
-- Os admins iniciais já são aplicados na seção 3d:
--   ngfilho@gmail.com
--   egeohub101@gmail.com
--
-- Para promover outro usuário:
-- update public.profiles set is_admin = true, role = 'admin'
-- where email = 'outro@email.com';

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
