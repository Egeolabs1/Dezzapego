create table if not exists public.price_alerts (
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  target_price numeric,
  created_at timestamptz not null default now(),
  primary key (user_id, ad_id)
);
alter table public.price_alerts enable row level security;
create policy "Users manage their own price alerts" on public.price_alerts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.marketplace_conversations (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (ad_id, buyer_id)
);
create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.marketplace_conversations enable row level security;
alter table public.marketplace_messages enable row level security;
create policy "Participants view conversations" on public.marketplace_conversations for select to authenticated using ((select auth.uid()) in (buyer_id, seller_id));
create policy "Buyers create conversations" on public.marketplace_conversations for insert to authenticated with check ((select auth.uid()) = buyer_id and buyer_id <> seller_id);
create policy "Participants view messages" on public.marketplace_messages for select to authenticated using (exists (select 1 from public.marketplace_conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));
create policy "Participants send messages" on public.marketplace_messages for insert to authenticated with check ((select auth.uid()) = sender_id and exists (select 1 from public.marketplace_conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));
