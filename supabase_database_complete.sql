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

create table if not exists public.seller_transactions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'completed' check (status in ('completed', 'canceled')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_transactions_no_self_transaction check (seller_id <> buyer_id),
  constraint seller_transactions_unique_ad_buyer unique (ad_id, buyer_id)
);

comment on table public.seller_transactions is
  'Transações concluídas registradas pelo vendedor para liberar avaliação do comprador.';

create index if not exists idx_seller_transactions_seller
  on public.seller_transactions(seller_id, completed_at desc);
create index if not exists idx_seller_transactions_buyer
  on public.seller_transactions(buyer_id, completed_at desc);
create index if not exists idx_seller_transactions_ad
  on public.seller_transactions(ad_id);

create table if not exists public.ad_contact_interests (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_contact_interests_no_self_interest check (seller_id <> buyer_id),
  constraint ad_contact_interests_unique unique (ad_id, buyer_id)
);

comment on table public.ad_contact_interests is
  'Usuários logados que abriram contato com o vendedor em um anúncio.';

create index if not exists idx_ad_contact_interests_ad
  on public.ad_contact_interests(ad_id, created_at desc);
create index if not exists idx_ad_contact_interests_seller
  on public.ad_contact_interests(seller_id, created_at desc);
create index if not exists idx_ad_contact_interests_buyer
  on public.ad_contact_interests(buyer_id, created_at desc);

create or replace function public.record_ad_contact_interest(p_ad_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select a.user_id into v_seller_id
  from public.ads a
  where a.id = p_ad_id
    and coalesce(a.status, 'active') = 'active';

  if v_seller_id is null then
    raise exception 'ad not found';
  end if;

  if v_seller_id = auth.uid() then
    return;
  end if;

  insert into public.ad_contact_interests (ad_id, seller_id, buyer_id)
  values (p_ad_id, v_seller_id, auth.uid())
  on conflict (ad_id, buyer_id) do update set updated_at = now();
end;
$$;

create or replace function public.get_ad_contact_interests(p_ad_id uuid)
returns table (
  buyer_id uuid,
  buyer_name text,
  buyer_email text,
  contacted_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id as buyer_id,
    p.full_name as buyer_name,
    p.email as buyer_email,
    i.updated_at as contacted_at
  from public.ad_contact_interests i
  join public.profiles p on p.id = i.buyer_id
  join public.ads a on a.id = i.ad_id
  where i.ad_id = p_ad_id
    and (auth.uid() = a.user_id or public.is_admin())
  order by i.updated_at desc;
$$;

revoke execute on function public.record_ad_contact_interest(uuid) from public;
grant execute on function public.record_ad_contact_interest(uuid) to authenticated;
revoke execute on function public.get_ad_contact_interests(uuid) from public;
grant execute on function public.get_ad_contact_interests(uuid) to authenticated;

create or replace function public.complete_ad_transaction(p_ad_id uuid, p_buyer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_transaction_id uuid;
begin
  select a.user_id into v_seller_id
  from public.ads a
  where a.id = p_ad_id;

  if v_seller_id is null then
    raise exception 'ad not found';
  end if;

  if auth.uid() is distinct from v_seller_id and not public.is_admin() then
    raise exception 'not allowed';
  end if;

  if p_buyer_id = v_seller_id then
    raise exception 'seller cannot be buyer';
  end if;

  if not exists (
    select 1
    from public.ad_contact_interests i
    where i.ad_id = p_ad_id
      and i.seller_id = v_seller_id
      and i.buyer_id = p_buyer_id
  ) then
    raise exception 'buyer did not contact seller for this ad';
  end if;

  insert into public.seller_transactions (ad_id, seller_id, buyer_id, status, completed_at)
  values (p_ad_id, v_seller_id, p_buyer_id, 'completed', now())
  on conflict (ad_id, buyer_id) do update set
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  returning id into v_transaction_id;

  update public.ads
  set status = 'sold',
      updated_at = now()
  where id = p_ad_id;

  return v_transaction_id;
end;
$$;

revoke execute on function public.complete_ad_transaction(uuid, uuid) from public;
grant execute on function public.complete_ad_transaction(uuid, uuid) to authenticated;

create table if not exists public.seller_reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.seller_transactions(id) on delete set null,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_reviews_no_self_review check (seller_id <> reviewer_id),
  constraint seller_reviews_unique_reviewer unique (seller_id, reviewer_id)
);

alter table public.seller_reviews
  add column if not exists transaction_id uuid references public.seller_transactions(id) on delete set null;

comment on table public.seller_reviews is
  'Avaliações públicas deixadas por usuários autenticados nos perfis dos anunciantes.';

create index if not exists idx_seller_reviews_seller_created
  on public.seller_reviews(seller_id, created_at desc);
create index if not exists idx_seller_reviews_reviewer
  on public.seller_reviews(reviewer_id);
create index if not exists idx_seller_reviews_transaction
  on public.seller_reviews(transaction_id);

create or replace function public.recalculate_seller_rating(p_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('dezzapego.allow_seller_rating_update', 'on', true);

  update public.profiles
  set rating = coalesce((
    select round(avg(sr.rating)::numeric, 2)
    from public.seller_reviews sr
    where sr.seller_id = p_seller_id
  ), 0),
  updated_at = now()
  where id = p_seller_id;
end;
$$;

create or replace function public.update_seller_rating_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_seller_rating(old.seller_id);
    return old;
  end if;

  perform public.recalculate_seller_rating(new.seller_id);
  return new;
end;
$$;

drop trigger if exists trg_seller_reviews_rating on public.seller_reviews;
create trigger trg_seller_reviews_rating
  after insert or update or delete on public.seller_reviews
  for each row execute function public.update_seller_rating_from_review();

alter table public.seller_reviews enable row level security;
alter table public.seller_transactions enable row level security;
alter table public.ad_contact_interests enable row level security;

drop policy if exists "Users can view related ad contact interests" on public.ad_contact_interests;
drop policy if exists "Admins can manage ad contact interests" on public.ad_contact_interests;

select public.create_policy_if_missing(
  'public', 'ad_contact_interests', 'Users can view related ad contact interests',
  $pol$create policy "Users can view related ad contact interests"
    on public.ad_contact_interests for select to authenticated
    using (auth.uid() = seller_id or auth.uid() = buyer_id or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'ad_contact_interests', 'Admins can manage ad contact interests',
  $pol$create policy "Admins can manage ad contact interests"
    on public.ad_contact_interests for all to authenticated
    using (public.is_admin()) with check (public.is_admin())$pol$
);

drop policy if exists "Users can view related seller transactions" on public.seller_transactions;
drop policy if exists "Admins can manage seller transactions" on public.seller_transactions;

select public.create_policy_if_missing(
  'public', 'seller_transactions', 'Users can view related seller transactions',
  $pol$create policy "Users can view related seller transactions"
    on public.seller_transactions for select to authenticated
    using (auth.uid() = seller_id or auth.uid() = buyer_id or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'seller_transactions', 'Admins can manage seller transactions',
  $pol$create policy "Admins can manage seller transactions"
    on public.seller_transactions for all to authenticated
    using (public.is_admin()) with check (public.is_admin())$pol$
);

drop policy if exists "Anyone can view seller reviews" on public.seller_reviews;
drop policy if exists "Users can create own seller reviews" on public.seller_reviews;
drop policy if exists "Users can update own seller reviews" on public.seller_reviews;
drop policy if exists "Users can delete own seller reviews" on public.seller_reviews;

select public.create_policy_if_missing(
  'public', 'seller_reviews', 'Anyone can view seller reviews',
  $pol$create policy "Anyone can view seller reviews"
    on public.seller_reviews for select using (true)$pol$
);

select public.create_policy_if_missing(
  'public', 'seller_reviews', 'Users can create own seller reviews',
  $pol$create policy "Users can create own seller reviews"
    on public.seller_reviews for insert to authenticated
    with check (
      auth.uid() = reviewer_id
      and reviewer_id <> seller_id
      and exists (
        select 1
        from public.seller_transactions st
        where st.id = transaction_id
          and st.seller_id = seller_id
          and st.buyer_id = reviewer_id
          and st.status = 'completed'
      )
    )$pol$
);

select public.create_policy_if_missing(
  'public', 'seller_reviews', 'Users can update own seller reviews',
  $pol$create policy "Users can update own seller reviews"
    on public.seller_reviews for update to authenticated
    using (auth.uid() = reviewer_id)
    with check (
      auth.uid() = reviewer_id
      and reviewer_id <> seller_id
      and exists (
        select 1
        from public.seller_transactions st
        where st.id = transaction_id
          and st.seller_id = seller_id
          and st.buyer_id = reviewer_id
          and st.status = 'completed'
      )
    )$pol$
);

select public.create_policy_if_missing(
  'public', 'seller_reviews', 'Users can delete own seller reviews',
  $pol$create policy "Users can delete own seller reviews"
    on public.seller_reviews for delete to authenticated using (auth.uid() = reviewer_id)$pol$
);

grant select on public.seller_reviews to anon, authenticated;
grant insert, update, delete on public.seller_reviews to authenticated;
grant select on public.seller_transactions to authenticated;
grant select on public.ad_contact_interests to authenticated;

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

  if current_setting('dezzapego.allow_seller_rating_update', true) = 'on' then
    if old.role is not distinct from new.role
      and old.is_admin is not distinct from new.is_admin
      and old.verified is not distinct from new.verified
      and old.verification_status is not distinct from new.verification_status
      and old.verification_docs is not distinct from new.verification_docs
      and old.verification_rejection_reason is not distinct from new.verification_rejection_reason
      and old.is_suspended is not distinct from new.is_suspended
      and old.suspended_reason is not distinct from new.suspended_reason then
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
    check (status in ('pending', 'active', 'paused', 'sold', 'expired', 'deleted', 'rejected'));
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

insert into public.system_settings (key, value)
values ('require_ad_approval', 'true'::jsonb)
on conflict (key) do nothing;

insert into public.system_settings (key, value)
values ('global_announcement', '{"enabled": false, "message": "", "scroll": false, "speed": 24, "backgroundColor": "#1d4ed8", "textColor": "#ffffff"}'::jsonb)
on conflict (key) do nothing;

create or replace function public.apply_ad_moderation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_require_approval boolean := true;
begin
  select coalesce((value #>> '{}')::boolean, true)
    into v_require_approval
  from public.system_settings
  where key = 'require_ad_approval';

  new.status := case when v_require_approval then 'pending' else 'active' end;
  return new;
end;
$$;

select public.create_trigger_if_missing(
  'public', 'ads', 'trg_ads_apply_moderation_status',
  $trg$create trigger trg_ads_apply_moderation_status
    before insert on public.ads
    for each row execute function public.apply_ad_moderation_status()$trg$
);


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

create table if not exists public.account_plan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.account_plans(id),
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

create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  applies_to text not null default 'all' check (applies_to in ('account_plan', 'featured', 'all')),
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.featured_payments add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);
alter table public.featured_payments add column if not exists coupon_id uuid references public.discount_coupons(id) on delete set null;
alter table public.featured_payments add column if not exists coupon_code text;
alter table public.account_plan_payments add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);
alter table public.account_plan_payments add column if not exists coupon_id uuid references public.discount_coupons(id) on delete set null;
alter table public.account_plan_payments add column if not exists coupon_code text;

create table if not exists public.user_account_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id uuid not null references public.account_plans(id),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'expired')),
  provider text not null check (provider in ('stripe', 'pixgo', 'admin')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  max_active_ads integer,
  max_photos_per_ad integer,
  monthly_featured_ads integer not null default 0,
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
create index if not exists idx_account_plan_payments_status on public.account_plan_payments(status);
create index if not exists idx_account_plan_payments_provider on public.account_plan_payments(provider);
create index if not exists idx_account_plan_payments_user_id on public.account_plan_payments(user_id);
create index if not exists idx_account_plan_payments_external_id on public.account_plan_payments(provider, external_id);
create index if not exists idx_discount_coupons_code on public.discount_coupons(code);
create index if not exists idx_discount_coupons_active on public.discount_coupons(active, applies_to);
create index if not exists idx_user_account_subscriptions_period on public.user_account_subscriptions(status, current_period_end);
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

select public.create_trigger_if_missing(
  'public', 'account_plan_payments', 'trg_account_plan_payments_updated_at',
  $trg$create trigger trg_account_plan_payments_updated_at
    before update on public.account_plan_payments
    for each row execute function public.set_updated_at()$trg$
);

select public.create_trigger_if_missing(
  'public', 'discount_coupons', 'trg_discount_coupons_updated_at',
  $trg$create trigger trg_discount_coupons_updated_at
    before update on public.discount_coupons
    for each row execute function public.set_updated_at()$trg$
);

select public.create_trigger_if_missing(
  'public', 'user_account_subscriptions', 'trg_user_account_subscriptions_updated_at',
  $trg$create trigger trg_user_account_subscriptions_updated_at
    before update on public.user_account_subscriptions
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
    'Assinar Empresa',
    '/register?plan=00000000-0000-4000-8000-000000000003',
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
alter table public.account_plan_payments enable row level security;
alter table public.discount_coupons enable row level security;
alter table public.user_account_subscriptions enable row level security;
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
  'public', 'account_plan_payments', 'Users can view own account plan payments',
  $pol$create policy "Users can view own account plan payments"
    on public.account_plan_payments for select using (auth.uid() = user_id or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'account_plan_payments', 'Admins can manage account plan payments',
  $pol$create policy "Admins can manage account plan payments"
    on public.account_plan_payments for all using (public.is_admin()) with check (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'discount_coupons', 'Admins can manage discount coupons',
  $pol$create policy "Admins can manage discount coupons"
    on public.discount_coupons for all using (public.is_admin()) with check (public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'user_account_subscriptions', 'Users can view own account subscription',
  $pol$create policy "Users can view own account subscription"
    on public.user_account_subscriptions for select using (auth.uid() = user_id or public.is_admin())$pol$
);

select public.create_policy_if_missing(
  'public', 'user_account_subscriptions', 'Admins can manage account subscriptions',
  $pol$create policy "Admins can manage account subscriptions"
    on public.user_account_subscriptions for all using (public.is_admin()) with check (public.is_admin())$pol$
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
grant select on public.account_plan_payments to authenticated;
grant select, insert, update, delete on public.discount_coupons to authenticated;
grant select on public.user_account_subscriptions to authenticated;
grant select on public.site_visits to authenticated;

comment on table public.featured_plans is 'Planos configuráveis de destaque pago.';
comment on table public.account_plans is 'Planos de conta configuráveis, incluindo limites de anúncios, fotos e destaques mensais.';
comment on table public.featured_payments is 'Pagamentos de destaque (Stripe ou PixGo).';
comment on table public.account_plan_payments is 'Pagamentos de planos de conta via Stripe ou PixGo.';
comment on table public.user_account_subscriptions is 'Assinatura ativa do usuário e limites derivados do plano pago.';
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners',
  'banners',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read banners storage" on storage.objects;
create policy "Public read banners storage"
  on storage.objects for select to public
  using (bucket_id = 'banners');

drop policy if exists "Admins upload banners storage" on storage.objects;
create policy "Admins upload banners storage"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and public.is_admin());

drop policy if exists "Admins update banners storage" on storage.objects;
create policy "Admins update banners storage"
  on storage.objects for update to authenticated
  using (bucket_id = 'banners' and public.is_admin())
  with check (bucket_id = 'banners' and public.is_admin());

drop policy if exists "Admins delete banners storage" on storage.objects;
create policy "Admins delete banners storage"
  on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and public.is_admin());

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


-- ===========================================================================
-- Adições Antigravity: RPCs de incremento atômico e políticas adicionais RLS
-- ===========================================================================

-- 1. Tabela audit_logs e políticas de Admin
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

-- Habilitar RLS em audit_logs
alter table public.audit_logs enable row level security;

-- Garantir que apenas Admins podem inserir e ler na audit_logs
drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs" on public.audit_logs
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- 2. Garantir RLS e atualizações em system_settings restritas a admins
alter table public.system_settings enable row level security;

drop policy if exists "Admins can manage system settings" on public.system_settings;
create policy "Admins can manage system settings" on public.system_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. RPC increment_coupon_usage
create or replace function public.increment_coupon_usage(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.discount_coupons
  set used_count = used_count + 1
  where id = p_coupon_id;
end;
$$;

revoke execute on function public.increment_coupon_usage(uuid) from anon;
grant execute on function public.increment_coupon_usage(uuid) to authenticated;

-- 4. RPC increment_ad_views
create or replace function public.increment_ad_views(p_ad_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_views integer;
begin
  update public.ads
  set views = coalesce(views, 0) + 1
  where id = p_ad_id
  returning views into v_views;
  
  return v_views;
end;
$$;

revoke execute on function public.increment_ad_views(uuid) from anon;
grant execute on function public.increment_ad_views(uuid) to authenticated, anon;



-- =============================================================================
-- FASE 1: CORE BUSINESS (businesses, business_members, business_followers)
-- =============================================================================

-- Dezzapego Empresas — FASE 1: CORE BUSINESS
-- businesses + business_members + business_followers

-- 1. businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL DEFAULT 'generic' CHECK (type IN ('generic','real_estate','vehicle_dealer','professional','store')),
  description text, logo_url text, cover_url text, highlight_color text DEFAULT '#2563EB',
  phone text, whatsapp text, email text, website text, instagram text, facebook text, cnpj text,
  address text, neighborhood text, city text, state text, cep text,
  lat double precision, lng double precision,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  attendance_options jsonb DEFAULT '["whatsapp","phone","in_person"]'::jsonb,
  verification_status text DEFAULT 'none' CHECK (verification_status IN ('none','pending','verified','rejected')),
  verification_docs jsonb, verification_rejection_reason text,
  rating numeric(3,2) DEFAULT 0, followers_count integer DEFAULT 0, ads_count integer DEFAULT 0,
  plan_type text DEFAULT 'free' CHECK (plan_type IN ('free','pro','max')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_state ON public.businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_businesses_type ON public.businesses(type);

-- 2. business_members
CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'viewer' CHECK (role IN ('owner','admin','manager','sales','agent','viewer')),
  invited_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active','invited','removed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bm_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bm_business ON public.business_members(business_id);

-- 3. business_followers
CREATE TABLE IF NOT EXISTS public.business_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (business_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bf_user ON public.business_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_bf_business ON public.business_followers(business_id);

-- 4. Triggers
SELECT create_trigger_if_missing('public','businesses','trg_businesses_updated_at',
  'CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');
SELECT create_trigger_if_missing('public','business_members','trg_bm_updated_at',
  'CREATE TRIGGER trg_bm_updated_at BEFORE UPDATE ON public.business_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

-- 5. RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_followers ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — businesses
SELECT create_policy_if_missing('public','businesses','Public read active',
  $$CREATE POLICY "Public read active" ON public.businesses FOR SELECT USING (is_active = true OR owner_id = auth.uid())$$);
SELECT create_policy_if_missing('public','businesses','Owner manage',
  $$CREATE POLICY "Owner manage" ON public.businesses FOR ALL USING (owner_id = auth.uid())$$);
SELECT create_policy_if_missing('public','businesses','Admin manage',
  $$CREATE POLICY "Admin manage" ON public.businesses FOR ALL USING (is_admin())$$);

-- 7. RLS policies — business_members
SELECT create_policy_if_missing('public','business_members','Members view',
  $$CREATE POLICY "Members view" ON public.business_members FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = business_members.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);
SELECT create_policy_if_missing('public','business_members','Owner manage members',
  $$CREATE POLICY "Owner manage members" ON public.business_members FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_members.business_id AND b.owner_id = auth.uid()))$$);
SELECT create_policy_if_missing('public','business_members','Admin manage members',
  $$CREATE POLICY "Admin manage members" ON public.business_members FOR ALL USING (is_admin())$$);

-- 8. RLS policies — business_followers
SELECT create_policy_if_missing('public','business_followers','Owner view followers',
  $$CREATE POLICY "Owner view followers" ON public.business_followers FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_followers.business_id AND b.owner_id = auth.uid()))$$);
SELECT create_policy_if_missing('public','business_followers','User view follows',
  $$CREATE POLICY "User view follows" ON public.business_followers FOR SELECT USING (user_id = auth.uid())$$);
SELECT create_policy_if_missing('public','business_followers','User follow',
  $$CREATE POLICY "User follow" ON public.business_followers FOR INSERT WITH CHECK (user_id = auth.uid())$$);
SELECT create_policy_if_missing('public','business_followers','User unfollow',
  $$CREATE POLICY "User unfollow" ON public.business_followers FOR DELETE USING (user_id = auth.uid())$$);

-- 9. RPC: create_business
CREATE OR REPLACE FUNCTION public.create_business(
  p_name text, p_type text DEFAULT 'generic', p_description text DEFAULT NULL,
  p_phone text DEFAULT NULL, p_whatsapp text DEFAULT NULL, p_email text DEFAULT NULL,
  p_city text DEFAULT NULL, p_state text DEFAULT NULL, p_neighborhood text DEFAULT NULL
) RETURNS public.businesses LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_slug_base text;
  v_slug text;
  v_counter int := 0;
  v_business public.businesses;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = v_user_id AND is_active = true) THEN
    RAISE EXCEPTION 'Você já possui uma empresa cadastrada.';
  END IF;
  v_slug_base := lower(regexp_replace(p_name, '[^a-zA-Z0-9 ]', '', 'g'));
  v_slug_base := regexp_replace(v_slug_base, ' +', '-', 'g');
  v_slug_base := trim(both '-' from v_slug_base);
  IF length(v_slug_base) < 2 THEN v_slug_base := 'empresa'; END IF;
  v_slug := v_slug_base;
  WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;
  INSERT INTO public.businesses (owner_id, name, slug, type, description, phone, whatsapp, email, city, state, neighborhood)
  VALUES (v_user_id, p_name, v_slug, p_type, p_description, p_phone, p_whatsapp, p_email, p_city, p_state, p_neighborhood)
  RETURNING * INTO v_business;
  INSERT INTO public.business_members (business_id, user_id, role, invited_by)
  VALUES (v_business.id, v_user_id, 'owner', v_user_id);
  RETURN v_business;
END;
$$;

-- 10. RPC: follow_business / unfollow_business
CREATE OR REPLACE FUNCTION public.follow_business(p_business_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  INSERT INTO public.business_followers (business_id, user_id) VALUES (p_business_id, auth.uid())
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted > 0 THEN
    UPDATE public.businesses SET followers_count = followers_count + 1 WHERE id = p_business_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_business(p_business_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.business_followers WHERE business_id = p_business_id AND user_id = auth.uid();
  UPDATE public.businesses SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = p_business_id;
END;
$$;

-- 11. RPC: is_business_owner
CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid());
$$;

-- 12. RPC: get_business_by_slug
CREATE OR REPLACE FUNCTION public.get_business_by_slug(p_slug text) RETURNS public.businesses
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT * FROM public.businesses WHERE slug = p_slug AND is_active = true LIMIT 1;
$$;

-- 13. Link ads to businesses
DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_ads_business ON public.ads(business_id) WHERE business_id IS NOT NULL;



-- =============================================================================
-- FASE 2: REAL ESTATE (business_real_estate, business_agents, property_leads, etc.)
-- =============================================================================

-- Dezzapego Empresas — FASE 2: REAL ESTATE (Imobiliárias)
-- business_real_estate + business_agents + property_leads + property_visits + business_bairros

-- =============================================================================
-- 1. business_real_estate — dados específicos de imobiliárias
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_real_estate (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  creci text,
  creci_type text DEFAULT 'pj' CHECK (creci_type IN ('pj','pf')),
  specialties text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  transaction_types text[] DEFAULT '{buy,sell,rent,seasonal,launch}',
  team_size integer DEFAULT 1,
  years_experience integer,
  properties_sold integer DEFAULT 0,
  avg_sale_price numeric,
  video_url text,
  whatsapp_message text DEFAULT 'Olá! Vim pelo Dezzapego e tenho interesse em um imóvel.',
  accepts_whatsapp boolean DEFAULT true,
  accepts_phone boolean DEFAULT true,
  accepts_visit boolean DEFAULT true,
  visit_scheduling_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 2. business_agents — corretores vinculados à imobiliária
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  creci text,
  creci_type text DEFAULT 'pf' CHECK (creci_type IN ('pf','pj')),
  phone text,
  whatsapp text,
  email text,
  avatar_url text,
  bio text,
  specialties text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 3. property_leads — leads gerados pela imobiliária
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.property_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.business_agents(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  buyer_whatsapp text,
  message text,
  source text DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','phone','form','visit','chat')),
  status text DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','scheduled','converted','lost')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 4. property_visits — agendamento de visitas a imóveis
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.property_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.business_agents(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_email text,
  visit_date date NOT NULL,
  visit_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','canceled','no_show')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 5. business_bairros — bairros onde a imobiliária atua
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_bairros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  city text NOT NULL,
  state text NOT NULL,
  neighborhood text NOT NULL,
  property_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (business_id, city, state, neighborhood)
);

-- =============================================================================
-- 6. Colunas adicionais na tabela ads (imóveis)
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.business_agents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS property_type text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS transaction_type text CHECK (transaction_type IN ('sale','rent','seasonal','launch'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bedrooms integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bathrooms integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS parking_spots integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS area_m2 numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS lot_area_m2 numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS floor_number integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS total_floors integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS year_built integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS furnished boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS condominium_fee numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS iptu_monthly numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- property_type é opcional — só preenchido para anúncios da categoria Imóveis.
-- Validação feita na aplicação (frontend + RPC).

-- =============================================================================
-- 7. Índices
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bre_business ON public.business_real_estate(business_id);
CREATE INDEX IF NOT EXISTS idx_ba_business ON public.business_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_ba_user ON public.business_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ba_creci ON public.business_agents(creci) WHERE creci IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ba_unique_creci ON public.business_agents(business_id, creci) WHERE creci IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pl_business ON public.property_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_pl_status ON public.property_leads(status);
CREATE INDEX IF NOT EXISTS idx_pv_business ON public.property_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_pv_date ON public.property_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_bb_business ON public.business_bairros(business_id);
CREATE INDEX IF NOT EXISTS idx_ads_agent ON public.ads(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_property_type ON public.ads(property_type) WHERE property_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_transaction_type ON public.ads(transaction_type) WHERE transaction_type IS NOT NULL;

-- =============================================================================
-- 8. RLS — Habilitar Row Level Security em todas as tabelas
-- =============================================================================

ALTER TABLE public.business_real_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_bairros ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9. RLS Policies — business_real_estate
-- =============================================================================

SELECT create_policy_if_missing('public','business_real_estate','Owner read',
  $$CREATE POLICY "Owner read" ON public.business_real_estate
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_real_estate.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_real_estate','Owner manage',
  $$CREATE POLICY "Owner manage" ON public.business_real_estate
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_real_estate.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_real_estate','Admin manage',
  $$CREATE POLICY "Admin manage" ON public.business_real_estate
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 10. RLS Policies — business_agents
-- =============================================================================

SELECT create_policy_if_missing('public','business_agents','Public read active agents',
  $$CREATE POLICY "Public read active agents" ON public.business_agents
    FOR SELECT USING (is_active = true)$$);

SELECT create_policy_if_missing('public','business_agents','Business members view agents',
  $$CREATE POLICY "Business members view agents" ON public.business_agents
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = business_agents.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);

SELECT create_policy_if_missing('public','business_agents','Owner manage agents',
  $$CREATE POLICY "Owner manage agents" ON public.business_agents
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_agents.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_agents','Admin manage agents',
  $$CREATE POLICY "Admin manage agents" ON public.business_agents
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 11. RLS Policies — property_leads
-- =============================================================================

SELECT create_policy_if_missing('public','property_leads','Business members view leads',
  $$CREATE POLICY "Business members view leads" ON public.property_leads
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = property_leads.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);

SELECT create_policy_if_missing('public','property_leads','Business members manage leads',
  $$CREATE POLICY "Business members manage leads" ON public.property_leads
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = property_leads.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','property_leads','Buyer view own leads',
  $$CREATE POLICY "Buyer view own leads" ON public.property_leads
    FOR SELECT USING (buyer_id = auth.uid())$$);

SELECT create_policy_if_missing('public','property_leads','Buyer create leads',
  $$CREATE POLICY "Buyer create leads" ON public.property_leads
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR buyer_id IS NULL)$$);

SELECT create_policy_if_missing('public','property_leads','Admin manage leads',
  $$CREATE POLICY "Admin manage leads" ON public.property_leads
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 12. RLS Policies — property_visits
-- =============================================================================

SELECT create_policy_if_missing('public','property_visits','Business members view visits',
  $$CREATE POLICY "Business members view visits" ON public.property_visits
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id = property_visits.business_id AND bm.user_id = auth.uid() AND bm.status = 'active'))$$);

SELECT create_policy_if_missing('public','property_visits','Business members manage visits',
  $$CREATE POLICY "Business members manage visits" ON public.property_visits
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = property_visits.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','property_visits','Buyer view own visits',
  $$CREATE POLICY "Buyer view own visits" ON public.property_visits
    FOR SELECT USING (buyer_id = auth.uid())$$);

SELECT create_policy_if_missing('public','property_visits','Buyer create visits',
  $$CREATE POLICY "Buyer create visits" ON public.property_visits
    FOR INSERT WITH CHECK (buyer_id = auth.uid() OR buyer_id IS NULL)$$);

SELECT create_policy_if_missing('public','property_visits','Admin manage visits',
  $$CREATE POLICY "Admin manage visits" ON public.property_visits
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 13. RLS Policies — business_bairros
-- =============================================================================

SELECT create_policy_if_missing('public','business_bairros','Public read bairros',
  $$CREATE POLICY "Public read bairros" ON public.business_bairros
    FOR SELECT USING (true)$$);

SELECT create_policy_if_missing('public','business_bairros','Owner manage bairros',
  $$CREATE POLICY "Owner manage bairros" ON public.business_bairros
    FOR ALL USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bairros.business_id AND b.owner_id = auth.uid()))$$);

SELECT create_policy_if_missing('public','business_bairros','Admin manage bairros',
  $$CREATE POLICY "Admin manage bairros" ON public.business_bairros
    FOR ALL USING (is_admin())$$);

-- =============================================================================
-- 14. Triggers — updated_at automático
-- =============================================================================

SELECT create_trigger_if_missing('public','business_real_estate','trg_bre_updated_at',
  'CREATE TRIGGER trg_bre_updated_at BEFORE UPDATE ON public.business_real_estate FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

SELECT create_trigger_if_missing('public','business_agents','trg_ba_updated_at',
  'CREATE TRIGGER trg_ba_updated_at BEFORE UPDATE ON public.business_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

SELECT create_trigger_if_missing('public','property_leads','trg_pl_updated_at',
  'CREATE TRIGGER trg_pl_updated_at BEFORE UPDATE ON public.property_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

SELECT create_trigger_if_missing('public','property_visits','trg_pv_updated_at',
  'CREATE TRIGGER trg_pv_updated_at BEFORE UPDATE ON public.property_visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()');

-- =============================================================================
-- 15. RPC: get_business_agents — listar corretores ativos de uma imobiliária
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_business_agents(p_business_id uuid)
RETURNS SETOF public.business_agents
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.business_agents
  WHERE business_id = p_business_id
    AND is_active = true
  ORDER BY sort_order ASC, name ASC;
$$;

-- =============================================================================
-- 16. RPC: create_property_lead — criar um lead a partir de interesse do comprador
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_property_lead(
  p_business_id uuid,
  p_ad_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_buyer_name text DEFAULT NULL,
  p_buyer_phone text DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_source text DEFAULT 'whatsapp'
) RETURNS public.property_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.property_leads;
  v_buyer_id uuid := auth.uid();
BEGIN
  INSERT INTO public.property_leads (
    business_id, ad_id, agent_id, buyer_id,
    buyer_name, buyer_phone, buyer_email, buyer_whatsapp,
    message, source
  ) VALUES (
    p_business_id, p_ad_id, p_agent_id, v_buyer_id,
    p_buyer_name, p_buyer_phone, p_buyer_email, p_buyer_phone,
    p_message, p_source
  )
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

-- =============================================================================
-- 17. RPC: schedule_property_visit — agendar uma visita ao imóvel
-- =============================================================================

CREATE OR REPLACE FUNCTION public.schedule_property_visit(
  p_business_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_visit_date date,
  p_visit_time time,
  p_ad_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS public.property_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit public.property_visits;
  v_buyer_id uuid := auth.uid();
BEGIN
  IF p_buyer_name IS NULL OR p_buyer_name = '' THEN
    RAISE EXCEPTION 'Nome do comprador é obrigatório.';
  END IF;

  IF p_buyer_phone IS NULL OR p_buyer_phone = '' THEN
    RAISE EXCEPTION 'Telefone do comprador é obrigatório.';
  END IF;

  IF p_visit_date IS NULL THEN
    RAISE EXCEPTION 'Data da visita é obrigatória.';
  END IF;

  IF p_visit_time IS NULL THEN
    RAISE EXCEPTION 'Horário da visita é obrigatório.';
  END IF;

  IF p_visit_date < current_date THEN
    RAISE EXCEPTION 'A data da visita não pode ser no passado.';
  END IF;

  INSERT INTO public.property_visits (
    business_id, ad_id, agent_id, buyer_id,
    buyer_name, buyer_phone, buyer_email,
    visit_date, visit_time, notes
  ) VALUES (
    p_business_id, p_ad_id, p_agent_id, v_buyer_id,
    p_buyer_name, p_buyer_phone, p_buyer_email,
    p_visit_date, p_visit_time, p_notes
  )
  RETURNING * INTO v_visit;

  RETURN v_visit;
END;
$$;

-- =============================================================================
-- 18. RPC: get_property_leads — listar leads de uma imobiliária (somente owner)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_property_leads(p_business_id uuid)
RETURNS SETOF public.property_leads
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pl.*
  FROM public.property_leads pl
  WHERE pl.business_id = p_business_id
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pl.business_id AND b.owner_id = auth.uid()
    )
  ORDER BY pl.created_at DESC;
$$;

-- =============================================================================
-- 19. RPC: get_property_visits — listar visitas de uma imobiliária (somente owner)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_property_visits(
  p_business_id uuid,
  p_date date DEFAULT NULL
) RETURNS SETOF public.property_visits
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pv.*
  FROM public.property_visits pv
  WHERE pv.business_id = p_business_id
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pv.business_id AND b.owner_id = auth.uid()
    )
    AND (p_date IS NULL OR pv.visit_date = p_date)
  ORDER BY pv.visit_date ASC, pv.visit_time ASC;
$$;

-- =============================================================================
-- 20. RPC: update_ads_count — manter businesses.ads_count sincronizado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_ads_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- Determinar qual business_id afetado
  IF TG_OP = 'DELETE' THEN
    v_business_id := OLD.business_id;
  ELSE
    v_business_id := NEW.business_id;
  END IF;

  -- Se o business_id mudou (UPDATE com reatribuição), atualizar ambos
  IF TG_OP = 'UPDATE' AND OLD.business_id IS DISTINCT FROM NEW.business_id THEN
    -- Decrementar no business antigo
    IF OLD.business_id IS NOT NULL THEN
      UPDATE public.businesses
      SET ads_count = GREATEST(ads_count - 1, 0)
      WHERE id = OLD.business_id;
    END IF;
    -- Incrementar no business novo
    IF NEW.business_id IS NOT NULL THEN
      UPDATE public.businesses
      SET ads_count = ads_count + 1
      WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Para INSERT/DELETE/UPDATE sem mudança de business_id
  IF v_business_id IS NOT NULL THEN
    UPDATE public.businesses
    SET ads_count = (
      SELECT COUNT(*)::integer
      FROM public.ads
      WHERE business_id = v_business_id
    )
    WHERE id = v_business_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para manter ads_count sincronizado
SELECT create_trigger_if_missing('public','ads','trg_ads_sync_count',
  'CREATE TRIGGER trg_ads_sync_count AFTER INSERT OR UPDATE OR DELETE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_ads_count()');

-- =============================================================================
-- 21. Comentários nas tabelas
-- =============================================================================

COMMENT ON TABLE public.business_real_estate IS 'Dados específicos de imobiliárias — extensão da tabela businesses.';
COMMENT ON TABLE public.business_agents IS 'Corretores vinculados a uma imobiliária.';
COMMENT ON TABLE public.property_leads IS 'Leads gerados por interações com anúncios de imóveis.';
COMMENT ON TABLE public.property_visits IS 'Agendamento de visitas presenciais a imóveis.';
COMMENT ON TABLE public.business_bairros IS 'Bairros onde a imobiliária atua, com contagem de imóveis.';



-- =============================================================================
-- FASE 3 — LOJAS DE VEÍCULOS
-- Business type: vehicle_dealer
-- Tabelas: business_vehicle_dealer, vehicle_listings, test_drives,
--          trade_ins, vehicle_collections
-- RPCs: create/update vehicle, schedule test drive, trade-in, financing sim
-- =============================================================================

-- =============================================================================
-- 1. Tabela business_vehicle_dealer — especialização de vehicle_dealer
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_vehicle_dealer (
  business_id        uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  cnpj               text,
  brands_worked      text[] DEFAULT '{}',
  has_financing      boolean DEFAULT false,
  accepts_trade      boolean DEFAULT false,
  has_delivery       boolean DEFAULT false,
  delivery_reach     text DEFAULT 'LOCAL' CHECK (delivery_reach IN ('LOCAL','REGIONAL','ESTADUAL','NACIONAL')),
  business_hours     text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE public.business_vehicle_dealer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_dealer_owner_all"
  ON public.business_vehicle_dealer FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_dealer_public_read"
  ON public.business_vehicle_dealer FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_vehicle_dealer_business ON public.business_vehicle_dealer(business_id);

COMMENT ON TABLE public.business_vehicle_dealer IS 'Especialização de businesses do tipo vehicle_dealer — lojas de veículos';

-- =============================================================================
-- 2. Tabela vehicle_listings — anúncios de veículos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id             uuid REFERENCES public.ads(id) ON DELETE SET NULL,

  -- dados do veículo
  brand             text NOT NULL,
  model             text NOT NULL,
  version           text,
  year_fabrication  integer NOT NULL,
  year_model        integer NOT NULL,
  price             numeric(12,2) NOT NULL,
  mileage           integer,
  transmission      text CHECK (transmission IN ('manual','automatic','automated','cvt')),
  fuel              text CHECK (fuel IN ('gasoline','ethanol','diesel','flex','electric','hybrid')),
  body_type         text CHECK (body_type IN ('sedan','hatch','suv','pickup','utility','motorcycle','van','other')),
  color             text,
  doors             integer,
  horsepower        integer,
  plate_last_digit  text,
  is_unique_owner   boolean DEFAULT false,
  is_armored        boolean DEFAULT false,
  has_warranty      boolean DEFAULT false,
  accepts_trade     boolean DEFAULT false,
  has_financing     boolean DEFAULT false,

  -- equipamentos (JSON array de strings)
  equipment         jsonb DEFAULT '[]'::jsonb,

  -- alcance e entrega
  reach             text DEFAULT 'LOCAL' CHECK (reach IN ('LOCAL','REGIONAL','ESTADUAL','NACIONAL')),
  delivery_options  text[] DEFAULT '{}',

  -- imagens
  images            text[] DEFAULT '{}',

  -- status e métricas
  status            text DEFAULT 'active' CHECK (status IN ('active','sold','reserved','paused')),
  views_count       integer DEFAULT 0,
  favorites_count   integer DEFAULT 0,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_listings ENABLE ROW LEVEL SECURITY;

-- RLS: owner e membros podem editar
CREATE POLICY "vehicle_listing_owner_all"
  ON public.vehicle_listings FOR ALL
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS: público pode ler veículos ativos
CREATE POLICY "vehicle_listing_public_read"
  ON public.vehicle_listings FOR SELECT
  USING (status = 'active' OR user_id = auth.uid()
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_business ON public.vehicle_listings(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_user ON public.vehicle_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_brand ON public.vehicle_listings(brand);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_model ON public.vehicle_listings(model);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_status ON public.vehicle_listings(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_price ON public.vehicle_listings(price);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_year ON public.vehicle_listings(year_model);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_body ON public.vehicle_listings(body_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_fuel ON public.vehicle_listings(fuel);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_transmission ON public.vehicle_listings(transmission);

COMMENT ON TABLE public.vehicle_listings IS 'Anúncios de veículos de lojas cadastradas no Dezzapego';

-- =============================================================================
-- 3. Tabela test_drives — agendamento de test drive
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.test_drives (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        uuid NOT NULL REFERENCES public.vehicle_listings(id) ON DELETE CASCADE,
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name        text NOT NULL,
  buyer_phone       text NOT NULL,
  buyer_email       text,
  requested_date    date NOT NULL,
  requested_time    time NOT NULL,
  status            text DEFAULT 'solicitado' CHECK (status IN ('solicitado','confirmado','reagendado','cancelado','concluido')),
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

-- RLS: comprador vê seus próprios test drives
CREATE POLICY "test_drive_buyer_read"
  ON public.test_drives FOR SELECT
  USING (user_id = auth.uid() OR buyer_phone IN (
    SELECT phone FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS: owner da loja vê e gerencia todos
CREATE POLICY "test_drive_business_owner"
  ON public.test_drives FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS: qualquer um autenticado pode criar (formulário público com auth)
CREATE POLICY "test_drive_create_auth"
  ON public.test_drives FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_drives_vehicle ON public.test_drives(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_business ON public.test_drives(business_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_user ON public.test_drives(user_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_status ON public.test_drives(status);
CREATE INDEX IF NOT EXISTS idx_test_drives_date ON public.test_drives(requested_date);

COMMENT ON TABLE public.test_drives IS 'Agendamentos de test drive para veículos de lojas';

-- =============================================================================
-- 4. Tabela trade_ins — veículos para troca (leads)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trade_ins (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ad_id             uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  brand             text NOT NULL,
  model             text NOT NULL,
  version           text,
  year              integer NOT NULL,
  mileage           integer,
  expected_value    numeric(12,2),
  images            text[] DEFAULT '{}',
  notes             text,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','contacted','negotiating','accepted','rejected')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.trade_ins ENABLE ROW LEVEL SECURITY;

-- RLS: owner da loja vê todos os trade-ins
CREATE POLICY "trade_in_business_owner"
  ON public.trade_ins FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS: usuário vê seus próprios
CREATE POLICY "trade_in_user_read"
  ON public.trade_ins FOR SELECT
  USING (user_id = auth.uid());

-- RLS: qualquer autenticado pode criar
CREATE POLICY "trade_in_create_auth"
  ON public.trade_ins FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_trade_ins_business ON public.trade_ins(business_id);
CREATE INDEX IF NOT EXISTS idx_trade_ins_user ON public.trade_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_ins_status ON public.trade_ins(status);

COMMENT ON TABLE public.trade_ins IS 'Veículos oferecidos em troca — gera lead automático para a loja';

-- =============================================================================
-- 5. Tabela vehicle_collections — coleções/vitrine da loja
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_collections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  description       text,
  image_url         text,
  sort_order        integer DEFAULT 0,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_owner_all"
  ON public.vehicle_collections FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "collection_public_read"
  ON public.vehicle_collections FOR SELECT
  USING (is_active = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_slug_business ON public.vehicle_collections(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_collection_business ON public.vehicle_collections(business_id);

COMMENT ON TABLE public.vehicle_collections IS 'Coleções temáticas da vitrine de uma loja de veículos';

-- =============================================================================
-- 6. Tabela vehicle_collection_items — vinculação veículo ↔ coleção
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_collection_items (
  collection_id     uuid NOT NULL REFERENCES public.vehicle_collections(id) ON DELETE CASCADE,
  vehicle_id        uuid NOT NULL REFERENCES public.vehicle_listings(id) ON DELETE CASCADE,
  sort_order        integer DEFAULT 0,
  PRIMARY KEY (collection_id, vehicle_id)
);

ALTER TABLE public.vehicle_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_items_owner"
  ON public.vehicle_collection_items FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM public.vehicle_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.vehicle_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "collection_items_public_read"
  ON public.vehicle_collection_items FOR SELECT
  USING (true);

COMMENT ON TABLE public.vehicle_collection_items IS 'Vinculação de veículos a coleções da vitrine';

-- =============================================================================
-- 7. RPC: create_vehicle_listing
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_vehicle_listing(
  p_business_id uuid,
  p_brand text,
  p_model text,
  p_year_fabrication integer,
  p_year_model integer,
  p_price numeric,
  p_version text DEFAULT NULL,
  p_mileage integer DEFAULT NULL,
  p_transmission text DEFAULT NULL,
  p_fuel text DEFAULT NULL,
  p_body_type text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_doors integer DEFAULT NULL,
  p_horsepower integer DEFAULT NULL,
  p_plate_last_digit text DEFAULT NULL,
  p_is_unique_owner boolean DEFAULT false,
  p_is_armored boolean DEFAULT false,
  p_has_warranty boolean DEFAULT false,
  p_accepts_trade boolean DEFAULT false,
  p_has_financing boolean DEFAULT false,
  p_equipment jsonb DEFAULT '[]'::jsonb,
  p_reach text DEFAULT 'LOCAL',
  p_delivery_options text[] DEFAULT '{}',
  p_images text[] DEFAULT '{}'
) RETURNS public.vehicle_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_vehicle public.vehicle_listings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Não é proprietário desta empresa'; END IF;

  INSERT INTO public.vehicle_listings (
    business_id, user_id, brand, model, version,
    year_fabrication, year_model, price, mileage,
    transmission, fuel, body_type, color, doors, horsepower,
    plate_last_digit, is_unique_owner, is_armored, has_warranty,
    accepts_trade, has_financing, equipment, reach, delivery_options, images
  ) VALUES (
    p_business_id, auth.uid(), p_brand, p_model, p_version,
    p_year_fabrication, p_year_model, p_price, p_mileage,
    p_transmission, p_fuel, p_body_type, p_color, p_doors, p_horsepower,
    p_plate_last_digit, p_is_unique_owner, p_is_armored, p_has_warranty,
    p_accepts_trade, p_has_financing, p_equipment, p_reach, p_delivery_options, p_images
  ) RETURNING * INTO v_vehicle;

  -- incrementar contador de anúncios da empresa
  UPDATE public.businesses SET ads_count = ads_count + 1 WHERE id = p_business_id;

  RETURN v_vehicle;
END;
$$;

COMMENT ON FUNCTION public.create_vehicle_listing IS 'Cria um anúncio de veículo para uma loja';

-- =============================================================================
-- 8. RPC: update_vehicle_listing
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_listing(
  p_vehicle_id uuid,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_version text DEFAULT NULL,
  p_year_fabrication integer DEFAULT NULL,
  p_year_model integer DEFAULT NULL,
  p_price numeric DEFAULT NULL,
  p_mileage integer DEFAULT NULL,
  p_transmission text DEFAULT NULL,
  p_fuel text DEFAULT NULL,
  p_body_type text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_doors integer DEFAULT NULL,
  p_horsepower integer DEFAULT NULL,
  p_plate_last_digit text DEFAULT NULL,
  p_is_unique_owner boolean DEFAULT NULL,
  p_is_armored boolean DEFAULT NULL,
  p_has_warranty boolean DEFAULT NULL,
  p_accepts_trade boolean DEFAULT NULL,
  p_has_financing boolean DEFAULT NULL,
  p_equipment jsonb DEFAULT NULL,
  p_reach text DEFAULT NULL,
  p_delivery_options text[] DEFAULT NULL,
  p_images text[] DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS public.vehicle_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_vehicle public.vehicle_listings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_vehicle FROM public.vehicle_listings WHERE id = p_vehicle_id;
  IF v_vehicle IS NULL THEN RAISE EXCEPTION 'Veículo não encontrado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = v_vehicle.business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Não é proprietário desta empresa'; END IF;

  UPDATE public.vehicle_listings SET
    brand = COALESCE(p_brand, brand),
    model = COALESCE(p_model, model),
    version = COALESCE(p_version, version),
    year_fabrication = COALESCE(p_year_fabrication, year_fabrication),
    year_model = COALESCE(p_year_model, year_model),
    price = COALESCE(p_price, price),
    mileage = COALESCE(p_mileage, mileage),
    transmission = COALESCE(p_transmission, transmission),
    fuel = COALESCE(p_fuel, fuel),
    body_type = COALESCE(p_body_type, body_type),
    color = COALESCE(p_color, color),
    doors = COALESCE(p_doors, doors),
    horsepower = COALESCE(p_horsepower, horsepower),
    plate_last_digit = COALESCE(p_plate_last_digit, plate_last_digit),
    is_unique_owner = COALESCE(p_is_unique_owner, is_unique_owner),
    is_armored = COALESCE(p_is_armored, is_armored),
    has_warranty = COALESCE(p_has_warranty, has_warranty),
    accepts_trade = COALESCE(p_accepts_trade, accepts_trade),
    has_financing = COALESCE(p_has_financing, has_financing),
    equipment = COALESCE(p_equipment, equipment),
    reach = COALESCE(p_reach, reach),
    delivery_options = COALESCE(p_delivery_options, delivery_options),
    images = COALESCE(p_images, images),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_vehicle;

  RETURN v_vehicle;
END;
$$;

COMMENT ON FUNCTION public.update_vehicle_listing IS 'Atualiza um anúncio de veículo';

-- =============================================================================
-- 9. RPC: schedule_test_drive
-- =============================================================================

CREATE OR REPLACE FUNCTION public.schedule_test_drive(
  p_vehicle_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_requested_date date,
  p_requested_time time,
  p_buyer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS public.test_drives
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_drive public.test_drives;
DECLARE v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id FROM public.vehicle_listings WHERE id = p_vehicle_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Veículo não encontrado'; END IF;

  INSERT INTO public.test_drives (
    vehicle_id, business_id, user_id,
    buyer_name, buyer_phone, buyer_email,
    requested_date, requested_time, notes
  ) VALUES (
    p_vehicle_id, v_business_id, auth.uid(),
    p_buyer_name, p_buyer_phone, p_buyer_email,
    p_requested_date, p_requested_time, p_notes
  ) RETURNING * INTO v_drive;

  RETURN v_drive;
END;
$$;

COMMENT ON FUNCTION public.schedule_test_drive IS 'Agenda um test drive para um veículo';

-- =============================================================================
-- 10. RPC: send_trade_in
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_trade_in(
  p_business_id uuid,
  p_brand text,
  p_model text,
  p_year integer,
  p_version text DEFAULT NULL,
  p_mileage integer DEFAULT NULL,
  p_expected_value numeric DEFAULT NULL,
  p_images text[] DEFAULT '{}',
  p_notes text DEFAULT NULL,
  p_ad_id uuid DEFAULT NULL
) RETURNS public.trade_ins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_trade public.trade_ins;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  INSERT INTO public.trade_ins (
    business_id, user_id, ad_id,
    brand, model, version, year,
    mileage, expected_value, images, notes
  ) VALUES (
    p_business_id, auth.uid(), p_ad_id,
    p_brand, p_model, p_version, p_year,
    p_mileage, p_expected_value, p_images, p_notes
  ) RETURNING * INTO v_trade;

  RETURN v_trade;
END;
$$;

COMMENT ON FUNCTION public.send_trade_in IS 'Envia um veículo para troca — gera lead para a loja';

-- =============================================================================
-- 11. RPC: simulate_financing (informativo)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.simulate_financing(
  p_vehicle_price numeric,
  p_down_payment numeric,
  p_installments integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_financed numeric;
DECLARE v_monthly numeric;
DECLARE v_total numeric;
BEGIN
  IF p_installments < 1 OR p_installments > 60 THEN
    RAISE EXCEPTION 'Parcelas deve ser entre 1 e 60';
  END IF;
  IF p_down_payment >= p_vehicle_price THEN
    RAISE EXCEPTION 'Entrada não pode ser igual ou superior ao valor do veículo';
  END IF;

  -- taxa estimada simples (1.99% ao mês — puramente informativo)
  v_financed := p_vehicle_price - p_down_payment;
  v_monthly := v_financed * (1 + 0.0199 * p_installments) / p_installments;
  v_total := v_monthly * p_installments;

  RETURN jsonb_build_object(
    'vehicle_price', p_vehicle_price,
    'down_payment', p_down_payment,
    'financed_amount', v_financed,
    'installments', p_installments,
    'estimated_monthly', round(v_monthly, 2),
    'estimated_total', round(v_total, 2),
    'disclaimer', 'Simulação informativa. Valores reais podem variar conforme instituição financeira.'
  );
END;
$$;

COMMENT ON FUNCTION public.simulate_financing IS 'Simulação informativa de financiamento — não é cotação real';

-- =============================================================================
-- 12. RPC: get_vehicle_filters — opções de filtro para uma loja
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_filters(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'brands', COALESCE((SELECT jsonb_agg(DISTINCT brand) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'), '[]'::jsonb),
    'models', COALESCE((SELECT jsonb_agg(DISTINCT model) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'), '[]'::jsonb),
    'body_types', COALESCE((SELECT jsonb_agg(DISTINCT body_type) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND body_type IS NOT NULL), '[]'::jsonb),
    'fuels', COALESCE((SELECT jsonb_agg(DISTINCT fuel) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND fuel IS NOT NULL), '[]'::jsonb),
    'transmissions', COALESCE((SELECT jsonb_agg(DISTINCT transmission) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND transmission IS NOT NULL), '[]'::jsonb),
    'colors', COALESCE((SELECT jsonb_agg(DISTINCT color) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND color IS NOT NULL), '[]'::jsonb),
    'min_year', (SELECT MIN(year_model) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'max_year', (SELECT MAX(year_model) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'min_price', (SELECT MIN(price) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'max_price', (SELECT MAX(price) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active'),
    'min_mileage', (SELECT MIN(mileage) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND mileage IS NOT NULL),
    'max_mileage', (SELECT MAX(mileage) FROM public.vehicle_listings WHERE business_id = p_business_id AND status = 'active' AND mileage IS NOT NULL)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_vehicle_filters IS 'Retorna opções de filtro disponíveis para o estoque de uma loja';

-- =============================================================================
-- 13. Trigger: updated_at para vehicle_listings
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_vehicle_listings_updated_at') THEN
    CREATE TRIGGER trigger_vehicle_listings_updated_at
      BEFORE UPDATE ON public.vehicle_listings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_test_drives_updated_at') THEN
    CREATE TRIGGER trigger_test_drives_updated_at
      BEFORE UPDATE ON public.test_drives
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_trade_ins_updated_at') THEN
    CREATE TRIGGER trigger_trade_ins_updated_at
      BEFORE UPDATE ON public.trade_ins
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- FIM DA FASE 3
-- =============================================================================



-- =============================================================================
-- FASE 4 — CRM, LEADS, PIPELINE, EQUIPE, COLLECTIONS
-- Tabelas: leads, lead_notes, lead_status_history, business_collections,
--          business_collection_listings
-- Atualiza: business_members (roles expandidos)
-- RPCs: CRUD leads, pipeline, métricas, membros, collections
-- =============================================================================

-- =============================================================================
-- 1. Enum de status do pipeline CRM
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE public.lead_status AS ENUM (
      'novo', 'contatado', 'negociando', 'visita', 'proposta', 'vendido', 'perdido'
    );
  END IF;
END $$;

-- =============================================================================
-- 2. Tabela leads — pipeline CRM
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ad_id             uuid REFERENCES public.ads(id) ON DELETE SET NULL,

  -- dados do contato
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text,

  -- pipeline
  status            public.lead_status DEFAULT 'novo',
  source            text DEFAULT 'manual' CHECK (source IN (
    'whatsapp', 'visita', 'test_drive', 'trade_in', 'chat',
    'telefone', 'formulario', 'manual', 'outro'
  )),
  responsible_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- dados do veículo/imóvel de interesse
  listing_type      text CHECK (listing_type IN ('property', 'vehicle', 'ad')),
  listing_id        uuid,

  -- notas e métricas
  notes             text,
  value             numeric(12,2),

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS: owner/admin/manager veem todos os leads da empresa
CREATE POLICY "leads_business_team"
  ON public.leads FOR ALL
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  );

-- RLS: owner pode ver tudo
CREATE POLICY "leads_owner_all"
  ON public.leads FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_leads_business ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_responsible ON public.leads(responsible_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at);

COMMENT ON TABLE public.leads IS 'Pipeline CRM — leads de todas as business types';

-- =============================================================================
-- 3. Tabela lead_notes — histórico de notas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id         uuid NOT NULL REFERENCES auth.users(id),
  text              text NOT NULL,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_notes_team"
  ON public.lead_notes FOR ALL
  USING (
    lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.business_members bm ON bm.business_id = l.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.business_members bm ON bm.business_id = l.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
    )
  );

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id);

COMMENT ON TABLE public.lead_notes IS 'Notas e observações dos leads no pipeline CRM';

-- =============================================================================
-- 4. Tabela lead_status_history — auditoria de mudanças
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status        public.lead_status,
  new_status        public.lead_status NOT NULL,
  changed_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_history_team"
  ON public.lead_status_history FOR SELECT
  USING (
    lead_id IN (
      SELECT l.id FROM public.leads l
      JOIN public.business_members bm ON bm.business_id = l.business_id
      WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "lead_history_insert"
  ON public.lead_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON public.lead_status_history(lead_id);

COMMENT ON TABLE public.lead_status_history IS 'Histórico de mudanças de status dos leads — auditoria';

-- =============================================================================
-- 5. Trigger: atualizar status history quando lead muda de status
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_lead_status_change') THEN
    CREATE TRIGGER trigger_lead_status_change
      AFTER UPDATE OF status ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();
  END IF;
END $$;

-- =============================================================================
-- 6. Tabela business_collections — coleções de anúncios
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_collections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  description       text,
  image_url         text,
  sort_order        integer DEFAULT 0,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.business_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_owner_all"
  ON public.business_collections FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "collection_public_read"
  ON public.business_collections FOR SELECT
  USING (is_active = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_slug ON public.business_collections(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_collection_business ON public.business_collections(business_id);

COMMENT ON TABLE public.business_collections IS 'Coleções temáticas de anúncios para vitrine da empresa';

-- =============================================================================
-- 7. Tabela business_collection_listings — pivot collection ↔ listing
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_collection_listings (
  collection_id     uuid NOT NULL REFERENCES public.business_collections(id) ON DELETE CASCADE,
  ad_id             uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  sort_order        integer DEFAULT 0,
  PRIMARY KEY (collection_id, ad_id)
);

ALTER TABLE public.business_collection_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cl_owner"
  ON public.business_collection_listings FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM public.business_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.business_collections WHERE business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "cl_public_read"
  ON public.business_collection_listings FOR SELECT
  USING (true);

COMMENT ON TABLE public.business_collection_listings IS 'Vinculação de anúncios a coleções da vitrine';

-- =============================================================================
-- 8. RPC: create_lead
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_lead(
  p_business_id uuid,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_ad_id uuid DEFAULT NULL,
  p_listing_type text DEFAULT NULL,
  p_listing_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_responsible_id uuid DEFAULT NULL,
  p_value numeric DEFAULT NULL
) RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead public.leads;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.leads (
    business_id, user_id, name, phone, email, source,
    ad_id, listing_type, listing_id, notes, responsible_id, value
  ) VALUES (
    p_business_id, auth.uid(), p_name, p_phone, p_email, p_source,
    p_ad_id, p_listing_type, p_listing_id, p_notes, p_responsible_id, p_value
  ) RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

COMMENT ON FUNCTION public.create_lead IS 'Cria um lead no pipeline CRM';

-- =============================================================================
-- 9. RPC: update_lead_status
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_lead_status(
  p_lead_id uuid,
  p_new_status text
) RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead public.leads;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  UPDATE public.leads
  SET status = p_new_status::public.lead_status,
      updated_at = now()
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

COMMENT ON FUNCTION public.update_lead_status IS 'Move um lead para novo status no pipeline';

-- =============================================================================
-- 10. RPC: get_leads_by_business
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_leads_by_business(
  p_business_id uuid,
  p_status text DEFAULT NULL,
  p_source text DEFAULT NULL
) RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.* FROM public.leads l
  WHERE l.business_id = p_business_id
    AND (p_status IS NULL OR l.status::text = p_status)
    AND (p_source IS NULL OR l.source = p_source)
  ORDER BY l.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_leads_by_business IS 'Lista leads de uma empresa com filtros';

-- =============================================================================
-- 11. RPC: add_lead_note
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_lead_note(
  p_lead_id uuid,
  p_text text
) RETURNS public.lead_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_note public.lead_notes;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  INSERT INTO public.lead_notes (lead_id, author_id, text)
  VALUES (p_lead_id, auth.uid(), p_text)
  RETURNING * INTO v_note;

  RETURN v_note;
END;
$$;

COMMENT ON FUNCTION public.add_lead_note IS 'Adiciona uma nota a um lead';

-- =============================================================================
-- 12. RPC: get_lead_with_notes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lead_with_notes(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead jsonb;
BEGIN
  SELECT jsonb_build_object(
    'lead', row_to_json(l.*),
    'notes', COALESCE((
      SELECT jsonb_agg(row_to_json(ln.*))
      FROM public.lead_notes ln WHERE ln.lead_id = l.id
      ORDER BY ln.created_at DESC
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(row_to_json(lsh.*))
      FROM public.lead_status_history lsh WHERE lsh.lead_id = l.id
      ORDER BY lsh.created_at DESC
    ), '[]'::jsonb)
  ) INTO v_lead
  FROM public.leads l WHERE l.id = p_lead_id;

  RETURN v_lead;
END;
$$;

COMMENT ON FUNCTION public.get_lead_with_notes IS 'Busca lead com notas e histórico completo';

-- =============================================================================
-- 13. RPC: get_business_dashboard_metrics
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_business_dashboard_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id),
    'leads_novo', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'novo'),
    'leads_contatado', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'contatado'),
    'leads_negociando', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'negociando'),
    'leads_visita', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'visita'),
    'leads_proposta', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'proposta'),
    'leads_vendido', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'vendido'),
    'leads_perdido', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'perdido'),
    'active_listings', (SELECT count(*) FROM public.ads WHERE business_id = p_business_id AND status = 'active'),
    'followers', (SELECT followers_count FROM public.businesses WHERE id = p_business_id),
    'total_views', (SELECT COALESCE(sum(views_count), 0) FROM public.ads WHERE business_id = p_business_id),
    'leads_by_source', (
      SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb)
      FROM (SELECT source, count(*) as cnt FROM public.leads WHERE business_id = p_business_id GROUP BY source) s
    ),
    'leads_by_week', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('week', week_start, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', created_at)::date as week_start, count(*) as cnt
        FROM public.leads WHERE business_id = p_business_id
        AND created_at > now() - interval '12 weeks'
        GROUP BY week_start ORDER BY week_start
      ) w
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_business_dashboard_metrics IS 'Métricas consolidadas do dashboard empresarial';

-- =============================================================================
-- 14. RPC: invite_business_member
-- =============================================================================

CREATE OR REPLACE FUNCTION public.invite_business_member(
  p_business_id uuid,
  p_email text,
  p_role text DEFAULT 'agent'
) RETURNS public.business_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_member public.business_members;
DECLARE v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Apenas o proprietário pode adicionar membros'; END IF;

  -- buscar usuário pelo email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', p_email;
  END IF;

  -- verificar se já é membro
  IF EXISTS (
    SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Usuário já é membro desta empresa';
  END IF;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (p_business_id, v_user_id, p_role)
  RETURNING * INTO v_member;

  RETURN v_member;
END;
$$;

COMMENT ON FUNCTION public.invite_business_member IS 'Convida um usuário para ser membro da empresa';

-- =============================================================================
-- 15. RPC: update_business_member_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_business_member_role(
  p_business_id uuid,
  p_user_id uuid,
  p_new_role text
) RETURNS public.business_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_member public.business_members;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Apenas o proprietário pode alterar papéis'; END IF;

  UPDATE public.business_members
  SET role = p_new_role
  WHERE business_id = p_business_id AND user_id = p_user_id
  RETURNING * INTO v_member;

  IF v_member IS NULL THEN RAISE EXCEPTION 'Membro não encontrado'; END IF;
  RETURN v_member;
END;
$$;

COMMENT ON FUNCTION public.update_business_member_role IS 'Altera o papel de um membro da empresa';

-- =============================================================================
-- 16. RPC: remove_business_member
-- =============================================================================

CREATE OR REPLACE FUNCTION public.remove_business_member(
  p_business_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Apenas o proprietário pode remover membros'; END IF;

  DELETE FROM public.business_members
  WHERE business_id = p_business_id AND user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.remove_business_member IS 'Remove um membro da empresa';

-- =============================================================================
-- 17. RPC: create/update/delete collection
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_business_collection(
  p_business_id uuid,
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL
) RETURNS public.business_collections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_col public.business_collections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.business_collections (business_id, name, slug, description, image_url)
  VALUES (p_business_id, p_name, p_slug, p_description, p_image_url)
  RETURNING * INTO v_col;

  RETURN v_col;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_collection(
  p_collection_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
) RETURNS public.business_collections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_col public.business_collections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  UPDATE public.business_collections SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    image_url = COALESCE(p_image_url, image_url),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_collection_id
  RETURNING * INTO v_col;

  RETURN v_col;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_business_collection(p_collection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  DELETE FROM public.business_collections WHERE id = p_collection_id;
END;
$$;

-- =============================================================================
-- 18. Trigger: updated_at para leads
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_leads_updated_at') THEN
    CREATE TRIGGER trigger_leads_updated_at
      BEFORE UPDATE ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- FIM DA FASE 4
-- =============================================================================



-- =============================================================================
-- FASE 5 — GEOLOCATION / LOCAL-FIRST
-- Funções de busca por proximidade, empresas próximas, anúncios por local
-- =============================================================================

-- =============================================================================
-- 1. Função auxiliar: cálculo Haversine (distância em km)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  R double precision := 6371;
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ^ 2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN R * c;
END;
$$;

-- =============================================================================
-- 2. RPC: get_nearby_businesses — empresas próximas
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_nearby_businesses(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 50,
  p_business_type text DEFAULT NULL,
  p_limit integer DEFAULT 20
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'slug', b.slug,
    'type', b.type,
    'logo_url', b.logo_url,
    'cover_url', b.cover_url,
    'cidade', b.cidade,
    'estado', b.estado,
    'rating', b.rating,
    'followers_count', b.followers_count,
    'ads_count', b.ads_count,
    'is_verified', b.is_verified,
    'distance_km', round(public.haversine_km(p_lat, p_lng, b.latitude, b.longitude)::numeric, 1)
  )
  FROM public.businesses b
  WHERE b.latitude IS NOT NULL
    AND b.longitude IS NOT NULL
    AND public.haversine_km(p_lat, p_lng, b.latitude, b.longitude) <= p_radius_km
    AND (p_business_type IS NULL OR b.type = p_business_type)
  ORDER BY public.haversine_km(p_lat, p_lng, b.latitude, b.longitude)
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_businesses IS 'Busca empresas dentro de um raio em km a partir de uma coordenada';

-- =============================================================================
-- 3. RPC: search_ads_by_location — anúncios por localização
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_ads_by_location(
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT 50,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'price', a.price,
    'category', a.category,
    'images', a.images,
    'cidade', a.cidade,
    'estado', a.estado,
    'bairro', a.bairro,
    'status', a.status,
    'views_count', a.views_count,
    'created_at', a.created_at,
    'distance_km', CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      THEN round(public.haversine_km(p_lat, p_lng, a.latitude, a.longitude)::numeric, 1)
      ELSE NULL
    END
  )
  FROM public.ads a
  WHERE a.status = 'active'
    AND (p_cidade IS NULL OR a.cidade ILIKE '%' || p_cidade || '%')
    AND (p_estado IS NULL OR a.estado ILIKE p_estado)
    AND (p_category IS NULL OR a.category = p_category)
    AND (p_search IS NULL OR a.title ILIKE '%' || p_search || '%')
    AND (
      p_lat IS NULL OR p_lng IS NULL OR a.latitude IS NULL OR a.longitude IS NULL
      OR public.haversine_km(p_lat, p_lng, a.latitude, a.longitude) <= p_radius_km
    )
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND a.latitude IS NOT NULL
      THEN public.haversine_km(p_lat, p_lng, a.latitude, a.longitude)
      ELSE 999999
    END
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.search_ads_by_location IS 'Busca anúncios com filtros de localização e raio';

-- =============================================================================
-- 4. RPC: get_location_suggestions — sugestões de local
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_location_suggestions(
  p_query text,
  p_limit integer DEFAULT 10
) RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT jsonb_build_object(
    'cidade', a.cidade,
    'estado', a.estado
  )
  FROM public.ads a
  WHERE a.cidade IS NOT NULL
    AND (
      a.cidade ILIKE '%' || p_query || '%'
      OR a.estado ILIKE '%' || p_query || '%'
    )
  ORDER BY a.cidade
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_location_suggestions IS 'Sugere cidades/estados baseado em texto digitado';

-- =============================================================================
-- FIM DA FASE 5
-- =============================================================================



-- =============================================================================
-- FASE 6 — SEO, URLs POR LOCALIZAÇÃO, STRUCTURED DATA
-- Tabela: seo_location_pages (páginas SEO por localização)
-- RPC: get_seo_location_page, get_seo_sitemap_entries
-- =============================================================================

-- =============================================================================
-- 1. Tabela seo_location_pages — páginas SEO por localização
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.seo_location_pages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_type         text NOT NULL CHECK (slug_type IN (
    'carros', 'imoveis', 'imobiliarias', 'lojas-de-carros',
    'celulares', 'eletronicos', 'moveis', 'roupas', 'outros'
  )),
  estado            text NOT NULL,
  cidade            text,
  bairro            text,
  marca             text,
  modelo            text,

  -- SEO metadata
  title             text NOT NULL,
  description       text NOT NULL,
  h1                text,
  canonical_path    text NOT NULL,

  -- conteúdo da página
  intro_text        text,
  is_active         boolean DEFAULT true,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.seo_location_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_location_public_read"
  ON public.seo_location_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "seo_location_admin_all"
  ON public.seo_location_pages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_location_canonical ON public.seo_location_pages(canonical_path);
CREATE INDEX IF NOT EXISTS idx_seo_location_type ON public.seo_location_pages(slug_type);
CREATE INDEX IF NOT EXISTS idx_seo_location_estado ON public.seo_location_pages(estado);
CREATE INDEX IF NOT EXISTS idx_seo_location_cidade ON public.seo_location_pages(cidade);

COMMENT ON TABLE public.seo_location_pages IS 'Páginas SEO estáticas por localização — URLs amigáveis para buscas';

-- =============================================================================
-- 2. RPC: get_seo_location_page — buscar página SEO por path
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_seo_location_page(p_path text)
RETURNS public.seo_location_pages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_page public.seo_location_pages;
BEGIN
  SELECT * INTO v_page
  FROM public.seo_location_pages
  WHERE canonical_path = p_path AND is_active = true;

  RETURN v_page;
END;
$$;

COMMENT ON FUNCTION public.get_seo_location_page IS 'Busca uma página SEO de localização pelo path canônico';

-- =============================================================================
-- 3. RPC: get_seo_sitemap_entries — gerar entradas do sitemap
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_seo_sitemap_entries()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'path', slp.canonical_path,
    'title', slp.title,
    'updated_at', slp.updated_at
  )
  FROM public.seo_location_pages slp
  WHERE slp.is_active = true
  ORDER BY slp.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_seo_sitemap_entries IS 'Retorna todas as páginas SEO ativas para o sitemap';

-- =============================================================================
-- 4. Trigger updated_at
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_seo_location_updated_at') THEN
    CREATE TRIGGER trigger_seo_location_updated_at
      BEFORE UPDATE ON public.seo_location_pages
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- FIM DA FASE 6
-- =============================================================================



-- =============================================================================
-- FASE 7 — PLANOS, MONETIZAÇÃO, FEATURE FLAGS
-- Tabelas: business_plans, business_subscriptions, business_feature_flags,
--          sponsored_listings
-- RPCs: get_plan_features, check_feature_flag, get_active_plan
-- =============================================================================

-- =============================================================================
-- 1. Enum de planos
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_plan_tier') THEN
    CREATE TYPE public.business_plan_tier AS ENUM ('free', 'pro', 'max');
  END IF;
END $$;

-- =============================================================================
-- 2. Tabela business_plans — definição dos planos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier              public.business_plan_tier UNIQUE NOT NULL,
  name              text NOT NULL,
  price_monthly     numeric(10,2) DEFAULT 0,
  price_yearly      numeric(10,2) DEFAULT 0,
  max_listings      integer DEFAULT 5,
  max_members       integer DEFAULT 1,
  has_crm           boolean DEFAULT false,
  has_collections   boolean DEFAULT false,
  has_import_csv    boolean DEFAULT false,
  has_api           boolean DEFAULT false,
  has_advanced_metrics boolean DEFAULT false,
  has_priority_support boolean DEFAULT false,
  has_sponsored     boolean DEFAULT false,
  features          jsonb DEFAULT '{}'::jsonb,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read"
  ON public.business_plans FOR SELECT
  USING (is_active = true);

-- Inserir planos padrão
INSERT INTO public.business_plans (tier, name, price_monthly, price_yearly, max_listings, max_members, has_crm, has_collections, has_import_csv, has_api, has_advanced_metrics, has_priority_support, has_sponsored, features)
VALUES
  ('free', 'Empresa Free', 0, 0, 5, 1, false, false, false, false, false, false, false, '{"analytics_basic": true}'::jsonb),
  ('pro', 'Empresa Pro', 49.90, 479.00, 50, 5, true, true, true, false, true, false, true, '{"analytics_advanced": true, "lead_pipeline": true, "team_management": true}'::jsonb),
  ('max', 'Empresa Max', 149.90, 1439.00, -1, 20, true, true, true, true, true, true, true, '{"analytics_advanced": true, "lead_pipeline": true, "team_management": true, "api_access": true, "priority_listing": true}'::jsonb)
ON CONFLICT (tier) DO NOTHING;

COMMENT ON TABLE public.business_plans IS 'Planos de assinatura para empresas — definição de limites e features';

-- =============================================================================
-- 3. Tabela business_subscriptions — assinaturas ativas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id           uuid NOT NULL REFERENCES public.business_plans(id),
  tier              public.business_plan_tier NOT NULL DEFAULT 'free',
  status            text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due')),
  started_at        timestamptz DEFAULT now(),
  expires_at        timestamptz,
  payment_method    text,
  external_id       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_owner"
  ON public.business_subscriptions FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_subscription_business ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON public.business_subscriptions(status);

COMMENT ON TABLE public.business_subscriptions IS 'Assinaturas de planos das empresas — rastreia status e expiração';

-- =============================================================================
-- 4. Tabela business_feature_flags — flags por empresa
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_feature_flags (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  flag_name         text NOT NULL,
  is_enabled        boolean DEFAULT true,
  config            jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(business_id, flag_name)
);

ALTER TABLE public.business_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flag_owner"
  ON public.business_feature_flags FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ff_business ON public.business_feature_flags(business_id);
CREATE INDEX IF NOT EXISTS idx_ff_flag ON public.business_feature_flags(flag_name);

COMMENT ON TABLE public.business_feature_flags IS 'Feature flags individuais por empresa — override dos planos';

-- =============================================================================
-- 5. Tabela sponsored_listings — destaque patrocinado
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsored_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id             uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sponsor_type      text NOT NULL CHECK (sponsor_type IN ('highlight','priority','category','regional')),
  start_date        timestamptz DEFAULT now(),
  end_date          timestamptz NOT NULL,
  budget            numeric(10,2),
  spent             numeric(10,2) DEFAULT 0,
  status            text DEFAULT 'active' CHECK (status IN ('active','paused','expired','completed')),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsored_owner"
  ON public.sponsored_listings FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "sponsored_public_read"
  ON public.sponsored_listings FOR SELECT
  USING (status = 'active' AND end_date > now());

CREATE INDEX IF NOT EXISTS idx_sponsored_ad ON public.sponsored_listings(ad_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_business ON public.sponsored_listings(business_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_status ON public.sponsored_listings(status);

COMMENT ON TABLE public.sponsored_listings IS 'Anúncios patrocinados — destaque, prioridade, categoria, regional';

-- =============================================================================
-- 6. RPC: get_active_plan — plano ativo da empresa
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_active_plan(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'plan', row_to_json(bp.*),
    'subscription', row_to_json(bs.*)
  ) INTO v_result
  FROM public.business_plans bp
  LEFT JOIN public.business_subscriptions bs ON bs.plan_id = bp.id AND bs.business_id = p_business_id AND bs.status = 'active'
  WHERE bp.tier = COALESCE(
    (SELECT tier FROM public.business_subscriptions WHERE business_id = p_business_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
    'free'::public.business_plan_tier
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_active_plan IS 'Retorna o plano ativo de uma empresa (Free se não tiver assinatura)';

-- =============================================================================
-- 7. RPC: check_feature_flag — verificar feature flag
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_feature_flag(
  p_business_id uuid,
  p_flag_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_override boolean;
DECLARE v_plan_feature boolean;
BEGIN
  -- 1. Verificar override individual da empresa
  SELECT is_enabled INTO v_override
  FROM public.business_feature_flags
  WHERE business_id = p_business_id AND flag_name = p_flag_name;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- 2. Verificar feature do plano
  SELECT CASE
    WHEN p_flag_name = 'crm' THEN bp.has_crm
    WHEN p_flag_name = 'collections' THEN bp.has_collections
    WHEN p_flag_name = 'import_csv' THEN bp.has_import_csv
    WHEN p_flag_name = 'api' THEN bp.has_api
    WHEN p_flag_name = 'advanced_metrics' THEN bp.has_advanced_metrics
    WHEN p_flag_name = 'priority_support' THEN bp.has_priority_support
    WHEN p_flag_name = 'sponsored' THEN bp.has_sponsored
    ELSE false
  END INTO v_plan_feature
  FROM public.business_plans bp
  WHERE bp.tier = COALESCE(
    (SELECT tier FROM public.business_subscriptions WHERE business_id = p_business_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
    'free'::public.business_plan_tier
  );

  RETURN COALESCE(v_plan_feature, false);
END;
$$;

COMMENT ON FUNCTION public.check_feature_flag IS 'Verifica se uma feature está disponível para uma empresa (plano + override)';

-- =============================================================================
-- 8. RPC: get_plan_features — todas as features do plano
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_plan_features(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tier public.business_plan_tier;
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(
    (SELECT tier FROM public.business_subscriptions WHERE business_id = p_business_id AND status = 'active' ORDER BY created_at DESC LIMIT 1),
    'free'::public.business_plan_tier
  ) INTO v_tier;

  SELECT jsonb_build_object(
    'tier', bp.tier,
    'name', bp.name,
    'max_listings', bp.max_listings,
    'max_members', bp.max_members,
    'has_crm', bp.has_crm,
    'has_collections', bp.has_collections,
    'has_import_csv', bp.has_import_csv,
    'has_api', bp.has_api,
    'has_advanced_metrics', bp.has_advanced_metrics,
    'has_priority_support', bp.has_priority_support,
    'has_sponsored', bp.has_sponsored,
    'features', bp.features
  ) INTO v_result
  FROM public.business_plans bp
  WHERE bp.tier = v_tier;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_plan_features IS 'Retorna todas as features e limites do plano da empresa';

-- =============================================================================
-- FIM DA FASE 7
-- =============================================================================



-- =============================================================================
-- FASE 8 — CORREÇÕES DE SEGURANÇA
-- Corrige funções RPC sem verificação de autorização (CRITICAL/HIGH)
-- =============================================================================

-- =============================================================================
-- 1. FIX: update_lead_status — adicionar verificação de membresia
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_lead_status(
  p_lead_id uuid,
  p_new_status text
) RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead public.leads;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_lead.business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_lead.business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  UPDATE public.leads
  SET status = p_new_status::public.lead_status, updated_at = now()
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

-- =============================================================================
-- 2. FIX: get_leads_by_business — adicionar verificação de membresia
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_leads_by_business(
  p_business_id uuid,
  p_status text DEFAULT NULL,
  p_source text DEFAULT NULL
) RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  RETURN QUERY
  SELECT l.* FROM public.leads l
  WHERE l.business_id = p_business_id
    AND (p_status IS NULL OR l.status::text = p_status)
    AND (p_source IS NULL OR l.source = p_source)
  ORDER BY l.created_at DESC;
END;
$$;

-- =============================================================================
-- 3. FIX: get_business_dashboard_metrics — adicionar verificação
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_business_dashboard_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  SELECT jsonb_build_object(
    'total_leads', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id),
    'leads_novo', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'novo'),
    'leads_contatado', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'contatado'),
    'leads_negociando', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'negociando'),
    'leads_visita', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'visita'),
    'leads_proposta', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'proposta'),
    'leads_vendido', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'vendido'),
    'leads_perdido', (SELECT count(*) FROM public.leads WHERE business_id = p_business_id AND status = 'perdido'),
    'active_listings', (SELECT count(*) FROM public.ads WHERE business_id = p_business_id AND status = 'active'),
    'followers', (SELECT followers_count FROM public.businesses WHERE id = p_business_id),
    'total_views', (SELECT COALESCE(sum(views_count), 0) FROM public.ads WHERE business_id = p_business_id),
    'leads_by_source', (
      SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb)
      FROM (SELECT source, count(*) as cnt FROM public.leads WHERE business_id = p_business_id GROUP BY source) s
    ),
    'leads_by_week', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('week', week_start, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', created_at)::date as week_start, count(*) as cnt
        FROM public.leads WHERE business_id = p_business_id
        AND created_at > now() - interval '12 weeks'
        GROUP BY week_start ORDER BY week_start
      ) w
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 4. FIX: get_lead_with_notes — adicionar verificação
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lead_with_notes(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lead jsonb;
DECLARE v_business_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT business_id INTO v_business_id FROM public.leads WHERE id = p_lead_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  SELECT jsonb_build_object(
    'lead', row_to_json(l.*),
    'notes', COALESCE((
      SELECT jsonb_agg(row_to_json(ln.*))
      FROM public.lead_notes ln WHERE ln.lead_id = l.id
      ORDER BY ln.created_at DESC
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(row_to_json(lsh.*))
      FROM public.lead_status_history lsh WHERE lsh.lead_id = l.id
      ORDER BY lsh.created_at DESC
    ), '[]'::jsonb)
  ) INTO v_lead
  FROM public.leads l WHERE l.id = p_lead_id;

  RETURN v_lead;
END;
$$;

-- =============================================================================
-- 5. FIX: add_lead_note — adicionar verificação
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_lead_note(
  p_lead_id uuid,
  p_text text
) RETURNS public.lead_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_note public.lead_notes;
DECLARE v_business_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT business_id INTO v_business_id FROM public.leads WHERE id = p_lead_id;
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = v_business_id AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin', 'manager', 'sales', 'agent')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.lead_notes (lead_id, author_id, text)
  VALUES (p_lead_id, auth.uid(), p_text)
  RETURNING * INTO v_note;

  RETURN v_note;
END;
$$;

-- =============================================================================
-- 6. FIX: update_business_collection — adicionar ownership check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_business_collection(
  p_collection_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
) RETURNS public.business_collections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_col public.business_collections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_collections bc
    JOIN public.businesses b ON b.id = bc.business_id
    WHERE bc.id = p_collection_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  UPDATE public.business_collections SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    image_url = COALESCE(p_image_url, image_url),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_collection_id
  RETURNING * INTO v_col;

  RETURN v_col;
END;
$$;

-- =============================================================================
-- 7. FIX: delete_business_collection — adicionar ownership check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_business_collection(p_collection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_collections bc
    JOIN public.businesses b ON b.id = bc.business_id
    WHERE bc.id = p_collection_id AND b.owner_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  DELETE FROM public.business_collections WHERE id = p_collection_id;
END;
$$;

-- =============================================================================
-- FIM DAS CORREÇÕES DE SEGURANÇA
-- =============================================================================

