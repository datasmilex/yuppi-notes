-- Dertleş — veritabanı şeması
-- ÖNEMLİ: Mesaj içerikleri HİÇBİR tabloda tutulmaz. Mesajlar Supabase Realtime
-- Broadcast üzerinden doğrudan iki taraf arasında iletilir ve kaydedilmez.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- agents
create table public.agents (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text not null default '',
  tags text[] not null default '{}',
  avatar_url text,
  -- {"1":{"start":"10:00","end":"18:00"}, ...}  1 = Pazartesi … 7 = Pazar
  schedule jsonb not null default '{}'::jsonb,
  is_online boolean not null default false,
  last_active_at timestamptz not null default now(), -- panel açıkken düzenli güncellenir
  approved boolean not null default false, -- yalnızca onaylı hesaplar ziyaretçilere görünür
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agents enable row level security;

create policy "agents: kendi satırını okur" on public.agents
  for select to authenticated using (auth.uid() = id);

create policy "agents: kendi profilini günceller" on public.agents
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- approved / sort_order temsilci tarafından değiştirilemesin
revoke update on public.agents from authenticated;
grant update (display_name, bio, tags, avatar_url, schedule, is_online, last_active_at, updated_at)
  on public.agents to authenticated;

create function public.handle_new_agent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null then
    insert into public.agents (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', initcap(split_part(new.email, '@', 1))));
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_agent();

-- ---------------------------------------------------------- chat_requests
-- Yalnızca görüşmenin meta verisi: durum, zamanlar, puanlar. İçerik yok.
create table public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  visitor_token_hash text not null,
  device_hash text not null,
  channel_key uuid not null default gen_random_uuid(),
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'ended', 'cancelled', 'declined')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  ended_by text check (ended_by in ('visitor', 'agent')),
  visitor_rating smallint check (visitor_rating between 1 and 5), -- ziyaretçinin temsilciye puanı
  agent_rating smallint check (agent_rating between 1 and 5)      -- temsilcinin görüşmeye puanı
);

-- Bir temsilci aynı anda en fazla 1 sohbet alabilir
create unique index chat_one_active_per_agent on public.chat_requests (agent_id) where status = 'active';
create index chat_agent_status_idx on public.chat_requests (agent_id, status, created_at);

alter table public.chat_requests enable row level security;

create policy "chat: temsilci kendi isteklerini okur" on public.chat_requests
  for select to authenticated using (agent_id = auth.uid());

alter publication supabase_realtime add table public.chat_requests;

-- -------------------------------------------------------- blocked_devices
create table public.blocked_devices (
  device_hash text primary key,
  blocked_by uuid references public.agents(id) on delete set null,
  until timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.blocked_devices enable row level security; -- yalnızca RPC'ler erişir

-- ------------------------------------------------------------- yardımcılar
create function public._sha256(p text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p, 'sha256'), 'hex')
$$;

create function public._avg_minutes(p_agent uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select greatest(3, coalesce(
    (select round(avg(extract(epoch from (ended_at - accepted_at)) / 60)::numeric, 0)
       from (select ended_at, accepted_at from public.chat_requests
              where agent_id = p_agent and status = 'ended'
                and accepted_at is not null and ended_at is not null
              order by ended_at desc limit 30) t),
    20))
$$;

-- -------------------------------------------------- herkese açık temsilci listesi
create function public.get_agents_public()
returns table (
  id uuid, display_name text, bio text, tags text[], avatar_url text, schedule jsonb,
  is_online boolean, busy boolean, waiting_count int, avg_rating numeric, rating_count int,
  avg_minutes numeric
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
    public._avg_minutes(a.id)
  from public.agents a
  where a.approved
  order by a.sort_order, a.display_name
$$;

-- ---------------------------------------------------------- ziyaretçi RPC'leri
create function public.create_request(p_agent uuid, p_device text)
returns table (request_id uuid, token text, channel_key uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_device text := public._sha256(coalesce(p_device, ''));
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_row public.chat_requests;
begin
  if p_device is null or length(p_device) < 16 then
    raise exception 'invalid_device';
  end if;
  if not exists (select 1 from public.agents where id = p_agent and approved and is_online
                   and last_active_at > now() - interval '2 minutes') then
    raise exception 'agent_offline';
  end if;
  if exists (select 1 from public.blocked_devices where device_hash = v_device and until > now()) then
    raise exception 'blocked';
  end if;

  -- Aynı cihazın bekleyen eski istekleri iptal edilir (tek seferde tek istek)
  update public.chat_requests set status = 'cancelled', ended_at = now()
   where device_hash = v_device and status = 'waiting';

  insert into public.chat_requests (agent_id, visitor_token_hash, device_hash)
  values (p_agent, public._sha256(v_token), v_device)
  returning * into v_row;

  return query select v_row.id, v_token, v_row.channel_key;
end $$;

create function public._visitor_row(p_id uuid, p_token text) returns public.chat_requests
language plpgsql security definer set search_path = '' as $$
declare v_row public.chat_requests;
begin
  select * into v_row from public.chat_requests
   where id = p_id and visitor_token_hash = public._sha256(coalesce(p_token, ''));
  if not found then raise exception 'not_found'; end if;
  return v_row;
end $$;

create function public.get_request_status(p_id uuid, p_token text)
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
    'visitor_rating', v_row.visitor_rating
  );
end $$;

create function public.visitor_cancel(p_id uuid, p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_row public.chat_requests := public._visitor_row(p_id, p_token);
begin
  update public.chat_requests set status = 'cancelled', ended_at = now()
   where id = v_row.id and status = 'waiting';
end $$;

create function public.visitor_end(p_id uuid, p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_row public.chat_requests := public._visitor_row(p_id, p_token);
begin
  update public.chat_requests set status = 'ended', ended_at = now(), ended_by = 'visitor'
   where id = v_row.id and status = 'active';
end $$;

create function public.visitor_rate(p_id uuid, p_token text, p_rating int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_row public.chat_requests := public._visitor_row(p_id, p_token);
begin
  if p_rating not between 1 and 5 then raise exception 'invalid_rating'; end if;
  update public.chat_requests set visitor_rating = p_rating
   where id = v_row.id and status = 'ended' and visitor_rating is null;
end $$;

-- ---------------------------------------------------------- temsilci RPC'leri
create function public.agent_accept(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.chat_requests where agent_id = auth.uid() and status = 'active') then
    raise exception 'already_in_chat';
  end if;
  update public.chat_requests set status = 'active', accepted_at = now()
   where id = p_id and agent_id = auth.uid() and status = 'waiting';
  if not found then raise exception 'not_waiting'; end if;
end $$;

create function public.agent_decline(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_requests set status = 'declined', ended_at = now()
   where id = p_id and agent_id = auth.uid() and status = 'waiting';
end $$;

create function public.agent_end(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_requests set status = 'ended', ended_at = now(), ended_by = 'agent'
   where id = p_id and agent_id = auth.uid() and status = 'active';
end $$;

create function public.agent_rate(p_id uuid, p_rating int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_rating not between 1 and 5 then raise exception 'invalid_rating'; end if;
  update public.chat_requests set agent_rating = p_rating
   where id = p_id and agent_id = auth.uid() and status = 'ended';
end $$;

create function public.agent_block(p_id uuid, p_hours int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_device text;
begin
  select device_hash into v_device from public.chat_requests
   where id = p_id and agent_id = auth.uid();
  if v_device is null then raise exception 'not_found'; end if;

  insert into public.blocked_devices (device_hash, blocked_by, until)
  values (v_device, auth.uid(), now() + make_interval(hours => greatest(1, least(p_hours, 24 * 30))))
  on conflict (device_hash) do update set until = excluded.until, blocked_by = excluded.blocked_by;

  update public.chat_requests
     set status = case when status = 'active' then 'ended' else 'declined' end,
         ended_at = now(),
         ended_by = case when status = 'active' then 'agent' else ended_by end
   where device_hash = v_device and status in ('waiting', 'active');
end $$;

create function public.agent_stats() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'total', count(*) filter (where status = 'ended'),
    'avg_rating', round(avg(visitor_rating)::numeric, 1),
    'rating_count', count(visitor_rating),
    'avg_minutes', public._avg_minutes(auth.uid())
  ) from public.chat_requests where agent_id = auth.uid()
$$;

-- ---------------------------------------------------------------- yetkiler
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_agents_public() to anon, authenticated;
grant execute on function public.create_request(uuid, text) to anon, authenticated;
grant execute on function public.get_request_status(uuid, text) to anon, authenticated;
grant execute on function public.visitor_cancel(uuid, text) to anon, authenticated;
grant execute on function public.visitor_end(uuid, text) to anon, authenticated;
grant execute on function public.visitor_rate(uuid, text, int) to anon, authenticated;
grant execute on function public.agent_accept(uuid) to authenticated;
grant execute on function public.agent_decline(uuid) to authenticated;
grant execute on function public.agent_end(uuid) to authenticated;
grant execute on function public.agent_rate(uuid, int) to authenticated;
grant execute on function public.agent_block(uuid, int) to authenticated;
grant execute on function public.agent_stats() to authenticated;

-- --------------------------------------------------------- avatar depolama
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: temsilci kendi klasörüne yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: temsilci kendi dosyasını günceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: temsilci kendi dosyasını siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: temsilci kendi dosyalarını listeler" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
