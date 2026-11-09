-- KVKK: aydınlatma + açık rıza kaydı ve otomatik veri silme

-- Ziyaretçinin Aydınlatma Metni / Açık Rıza onayını verdiği an
alter table public.chat_requests add column privacy_consent_at timestamptz;

-- create_request: gizlilik onayı zorunlu
drop function public.create_request(uuid, text, boolean);
create function public.create_request(
  p_agent uuid, p_device text, p_adult_consent boolean default false, p_privacy_consent boolean default false
)
returns table (request_id uuid, token text, channel_key uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_device text := public._sha256(coalesce(p_device, ''));
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_agent public.agents;
  v_row public.chat_requests;
begin
  if not coalesce(p_privacy_consent, false) then
    raise exception 'privacy_consent_required';
  end if;
  if p_device is null or length(p_device) < 16 then
    raise exception 'invalid_device';
  end if;
  select * into v_agent from public.agents
   where id = p_agent and approved and is_online and last_active_at > now() - interval '2 minutes';
  if not found then raise exception 'agent_offline'; end if;
  if v_agent.is_adult and not coalesce(p_adult_consent, false) then
    raise exception 'adult_consent_required';
  end if;
  if exists (select 1 from public.blocked_devices where device_hash = v_device and until > now()) then
    raise exception 'blocked';
  end if;

  update public.chat_requests set status = 'cancelled', ended_at = now()
   where device_hash = v_device and status = 'waiting';

  insert into public.chat_requests (agent_id, visitor_token_hash, device_hash, adult_consent_at, privacy_consent_at)
  values (p_agent, public._sha256(v_token), v_device,
          case when coalesce(p_adult_consent, false) then now() end, now())
  returning * into v_row;

  return query select v_row.id, v_token, v_row.channel_key;
end $$;
revoke execute on function public.create_request(uuid, text, boolean, boolean) from public;
grant execute on function public.create_request(uuid, text, boolean, boolean) to anon, authenticated;

-- Saklama süreleri (Aydınlatma Metni ile aynı):
--  * Biten görüşmelerde cihaz özeti ve erişim anahtarı özeti 24 saat sonra silinir
--  * Ziyaretçisi ayrılmış bekleyen istekler 24 saat sonra iptal edilir
--  * Görüşme meta verisi (zamanlar, puanlar) 1 yıl sonra tamamen silinir
--  * Süresi dolan engellemeler silinir
create function public.purge_old_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_requests set status = 'cancelled', ended_at = now()
   where status = 'waiting' and last_seen_at < now() - interval '24 hours';

  update public.chat_requests set device_hash = 'silindi', visitor_token_hash = 'silindi'
   where status in ('ended', 'cancelled', 'declined')
     and coalesce(ended_at, created_at) < now() - interval '24 hours'
     and device_hash <> 'silindi';

  delete from public.chat_requests where created_at < now() - interval '1 year';
  delete from public.blocked_devices where until < now();
end $$;
revoke execute on function public.purge_old_data() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('dertles-purge', '0 3 * * *', 'select public.purge_old_data()');
