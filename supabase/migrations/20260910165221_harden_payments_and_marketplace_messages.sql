alter table public.user_account_subscriptions
  add column if not exists external_subscription_id text;

create unique index if not exists idx_user_account_subscriptions_external_subscription_id
  on public.user_account_subscriptions (external_subscription_id)
  where external_subscription_id is not null;

create table if not exists public.payment_webhook_events (
  provider text not null check (provider in ('stripe', 'pixgo')),
  event_id text not null,
  created_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from anon, authenticated;

create or replace function public.activate_featured_payment(p_payment_id uuid)
returns table(activated boolean, expires_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.featured_payments%rowtype;
  v_duration_days integer;
  v_current_expires_at timestamptz;
  v_expires_at timestamptz;
  v_coupon_updated integer;
begin
  select * into v_payment from public.featured_payments where id = p_payment_id for update;
  if not found then
    raise exception 'featured payment not found: %', p_payment_id;
  end if;

  if v_payment.status = 'paid' then
    return query select false, v_payment.expires_at;
    return;
  end if;

  select duration_days into v_duration_days from public.featured_plans where id = v_payment.plan_id;
  if coalesce(v_duration_days, 0) <= 0 then
    raise exception 'featured plan not found: %', v_payment.plan_id;
  end if;

  select featured_expires_at into v_current_expires_at from public.ads where id = v_payment.ad_id for update;
  if not found then
    raise exception 'ad not found: %', v_payment.ad_id;
  end if;

  v_expires_at := greatest(coalesce(v_current_expires_at, now()), now()) + make_interval(days => v_duration_days);

  if v_payment.coupon_id is not null then
    update public.discount_coupons
    set used_count = used_count + 1
    where id = v_payment.coupon_id
      and active = true
      and (max_uses is null or used_count < max_uses);
    get diagnostics v_coupon_updated = row_count;
    if v_coupon_updated <> 1 then
      raise exception 'coupon is no longer available';
    end if;
  end if;

  update public.ads
  set featured = true, featured_expires_at = v_expires_at
  where id = v_payment.ad_id;

  update public.featured_payments
  set status = 'paid', paid_at = coalesce(paid_at, now()), expires_at = v_expires_at
  where id = p_payment_id;

  return query select true, v_expires_at;
end;
$$;

create or replace function public.activate_account_plan_payment(
  p_payment_id uuid,
  p_external_subscription_id text default null
)
returns table(activated boolean, expires_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.account_plan_payments%rowtype;
  v_plan public.account_plans%rowtype;
  v_current_period_end timestamptz;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_coupon_updated integer;
begin
  select * into v_payment from public.account_plan_payments where id = p_payment_id for update;
  if not found then
    raise exception 'account plan payment not found: %', p_payment_id;
  end if;

  if v_payment.status = 'paid' then
    if p_external_subscription_id is not null then
      update public.user_account_subscriptions
      set external_subscription_id = p_external_subscription_id, updated_at = now()
      where user_id = v_payment.user_id
        and external_subscription_id is null;
    end if;
    return query select false, v_payment.expires_at;
    return;
  end if;

  select * into v_plan from public.account_plans where id = v_payment.plan_id;
  if not found then
    raise exception 'account plan not found: %', v_payment.plan_id;
  end if;

  select current_period_end into v_current_period_end
  from public.user_account_subscriptions
  where user_id = v_payment.user_id
  for update;

  v_starts_at := greatest(coalesce(v_current_period_end, now()), now());
  v_expires_at := v_starts_at + interval '1 month';

  if v_payment.coupon_id is not null then
    update public.discount_coupons
    set used_count = used_count + 1
    where id = v_payment.coupon_id
      and active = true
      and (max_uses is null or used_count < max_uses);
    get diagnostics v_coupon_updated = row_count;
    if v_coupon_updated <> 1 then
      raise exception 'coupon is no longer available';
    end if;
  end if;

  insert into public.user_account_subscriptions (
    user_id, plan_id, status, provider, external_subscription_id,
    current_period_start, current_period_end, max_active_ads,
    max_photos_per_ad, monthly_featured_ads, updated_at
  ) values (
    v_payment.user_id, v_payment.plan_id, 'active', v_payment.provider, p_external_subscription_id,
    v_starts_at, v_expires_at, v_plan.max_active_ads,
    v_plan.max_photos_per_ad, coalesce(v_plan.monthly_featured_ads, 0), now()
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    status = 'active',
    provider = excluded.provider,
    external_subscription_id = coalesce(excluded.external_subscription_id, public.user_account_subscriptions.external_subscription_id),
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    max_active_ads = excluded.max_active_ads,
    max_photos_per_ad = excluded.max_photos_per_ad,
    monthly_featured_ads = excluded.monthly_featured_ads,
    updated_at = now();

  update public.account_plan_payments
  set status = 'paid', paid_at = coalesce(paid_at, now()), expires_at = v_expires_at,
      external_id = coalesce(p_external_subscription_id, external_id)
  where id = p_payment_id;

  return query select true, v_expires_at;
end;
$$;

create or replace function public.renew_stripe_account_plan(
  p_subscription_id text,
  p_event_id text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subscription public.user_account_subscriptions%rowtype;
  v_expires_at timestamptz;
begin
  insert into public.payment_webhook_events (provider, event_id)
  values ('stripe', p_event_id)
  on conflict do nothing;
  if not found then
    return false;
  end if;

  select * into v_subscription
  from public.user_account_subscriptions
  where external_subscription_id = p_subscription_id
  for update;
  if not found then
    raise exception 'subscription not found: %', p_subscription_id;
  end if;

  v_expires_at := greatest(v_subscription.current_period_end, now()) + interval '1 month';
  update public.user_account_subscriptions
  set status = 'active', current_period_start = greatest(v_subscription.current_period_end, now()),
      current_period_end = v_expires_at, updated_at = now()
  where user_id = v_subscription.user_id;
  return true;
end;
$$;

revoke all on function public.activate_featured_payment(uuid) from public, anon, authenticated;
revoke all on function public.activate_account_plan_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.renew_stripe_account_plan(text, text) from public, anon, authenticated;
grant execute on function public.activate_featured_payment(uuid) to service_role;
grant execute on function public.activate_account_plan_payment(uuid, text) to service_role;
grant execute on function public.renew_stripe_account_plan(text, text) to service_role;

drop policy if exists "Buyers create conversations" on public.marketplace_conversations;
create policy "Buyers create conversations for the ad owner"
  on public.marketplace_conversations for insert to authenticated
  with check (
    (select auth.uid()) = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1 from public.ads
      where ads.id = ad_id and ads.user_id = seller_id
    )
  );

create or replace function public.prevent_message_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.conversation_id <> old.conversation_id
    or new.sender_id <> old.sender_id
    or new.body <> old.body
    or new.created_at <> old.created_at
    or old.read_at is not null
    or new.read_at is null then
    raise exception 'messages are immutable except for the initial read receipt';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_message_mutation on public.marketplace_messages;
create trigger trg_prevent_message_mutation
  before update on public.marketplace_messages
  for each row execute function public.prevent_message_mutation();

drop policy if exists "Recipients mark messages as read" on public.marketplace_messages;
create policy "Recipients mark messages as read"
  on public.marketplace_messages for update to authenticated
  using (
    read_at is null
    and sender_id <> (select auth.uid())
    and exists (
      select 1 from public.marketplace_conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  )
  with check (
    read_at is not null
    and sender_id <> (select auth.uid())
    and exists (
      select 1 from public.marketplace_conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

grant select, insert, update on public.marketplace_conversations to authenticated;
grant select, insert, update on public.marketplace_messages to authenticated;
