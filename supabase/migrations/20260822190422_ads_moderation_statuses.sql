-- O fluxo de publicação cria anúncios pendentes até a moderação aprová-los.
-- O painel administrativo também permite rejeitá-los.
alter table public.ads drop constraint if exists ads_status_check;

alter table public.ads add constraint ads_status_check
  check (status in ('pending', 'active', 'paused', 'sold', 'expired', 'deleted', 'rejected'));
