-- +18 (argo/küfürlü dil serbest) modu
-- Temsilci panelden açar; ziyaretçi bağlanmadan önce 18 yaş beyanı ve kuralları onaylar.
-- Onay anı zaman damgası olarak saklanır (içerik yok).

alter table public.agents add column is_adult boolean not null default false;
grant update (is_adult) on public.agents to authenticated;

alter table public.chat_requests add column adult_consent_at timestamptz;

drop function public.get_agents_public();
create function public.get_agents_public()
returns table (
  id uuid, display_name text, bio text, tags text[], avatar_url text, schedule jsonb,
  is_online boolean, busy boolean, waiting_count int, avg_rating numeric, rating_count int,
  avg_minutes numeric, is_adult boolean
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.display_name, a.bio, a.tags, a.avatar_url, a.schedule,
    (a.is_online and a.last_active_at > now() - interval '2 minutes'),
    exists (select 1 from public.chat_requests c where c.agent_id = a.id and c.status = 'active'),
    (select count(*)::int from public.chat_requests c
      where c.agent_id = a.id and c.status = 'waiting'
        and c.last_seen_at > now() - interval '45 seconds'),
    (select round(avg(c.visitor_rating)::numeric, 1) from public.chat_requests c
      where c.agent_id = a.id and c.visitor_rating is not null),
    (select count(*)::int from public.chat_requests c
      where c.agent_id = a.id and c.visitor_rating is not null),
    public._avg_minutes(a.id),
    a.is_adult
  from public.agents a
  where a.approved
  order by a.sort_order, a.display_name
$$;
revoke execute on function public.get_agents_public() from public;
grant execute on function public.get_agents_public() to anon, authenticated;

drop function public.create_request(uuid, text);
create function public.create_request(p_agent uuid, p_device text, p_adult_consent boolean default false)
returns table (request_id uuid, token text, channel_key uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_device text := public._sha256(coalesce(p_device, ''));
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_agent public.agents;
  v_row public.chat_requests;
begin
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

  insert into public.chat_requests (agent_id, visitor_token_hash, device_hash, adult_consent_at)
  values (p_agent, public._sha256(v_token), v_device,
          case when coalesce(p_adult_consent, false) then now() end)
  returning * into v_row;

  return query select v_row.id, v_token, v_row.channel_key;
end $$;
revoke execute on function public.create_request(uuid, text, boolean) from public;
grant execute on function public.create_request(uuid, text, boolean) to anon, authenticated;

create or replace function public.agent_accept(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.chat_requests where agent_id = auth.uid() and status = 'active') then
    raise exception 'already_in_chat';
  end if;
  if exists (select 1 from public.agents a join public.chat_requests c on c.agent_id = a.id
              where c.id = p_id and a.id = auth.uid() and a.is_adult and c.adult_consent_at is null) then
    raise exception 'consent_missing';
  end if;
  update public.chat_requests set status = 'active', accepted_at = now()
   where id = p_id and agent_id = auth.uid() and status = 'waiting';
  if not found then raise exception 'not_waiting'; end if;
end $$;

create or replace function public.get_request_status(p_id uuid, p_token text)
returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.chat_requests := public._visitor_row(p_id, p_token);
  v_ahead int := 0;
  v_busy boolean := false;
  v_avg numeric;
begin
  update public.chat_requests set last_seen_at = now() where id = v_row.id;

  if v_row.status = 'waiting' then
    select count(*)::int into v_ahead from public.chat_requests
     where agent_id = v_row.agent_id and status = 'waiting'
       and created_at < v_row.created_at
       and last_seen_at > now() - interval '45 seconds';
    select exists (select 1 from public.chat_requests
                    where agent_id = v_row.agent_id and status = 'active') into v_busy;
  end if;
  v_avg := public._avg_minutes(v_row.agent_id);

  return json_build_object(
    'status', v_row.status,
    'agent_id', v_row.agent_id,
    'ahead', v_ahead,
    'busy', v_busy,
    'est_minutes', case when v_row.status = 'waiting'
                        then ceil((v_ahead + case when v_busy then 1 else 0 end) * v_avg)
                        else null end,
    'created_at', v_row.created_at,
    'accepted_at', v_row.accepted_at,
    'ended_by', v_row.ended_by,
    'visitor_rating', v_row.visitor_rating,
    'adult', v_row.adult_consent_at is not null
  );
end $$;
