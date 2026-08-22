-- Administradores definem se novos anúncios entram ativos ou aguardam análise.
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

drop trigger if exists trg_ads_apply_moderation_status on public.ads;
create trigger trg_ads_apply_moderation_status
  before insert on public.ads
  for each row execute function public.apply_ad_moderation_status();
