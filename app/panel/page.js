'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import Stars from '@/components/Stars';
import LoginForm from '@/components/LoginForm';
import AgentChat, { visitorLabel } from '@/components/AgentChat';
import { getSupabase } from '@/lib/supabase';
import { useAgentAuth } from '@/lib/useAgentAuth';
import { friendlyError } from '@/lib/errors';

function since(ts, now) {
  const s = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

export default function PanelPage() {
  const { session, agent, setAgent, signOut } = useAgentAuth();

  if (session === undefined) return <main className="auth"><div className="spinner" /></main>;
  if (!session) return <LoginForm />;
  if (agent === null) return <main className="auth"><div className="spinner" /></main>;
  if (agent === false || !agent.approved) {
    return (
      <main className="auth">
        <div className="auth-card">
          <h1>Hesabın henüz onaylanmadı</h1>
          <p className="muted">Bu hesap bir temsilci olarak etkinleştirilmemiş. Yöneticiyle iletişime geç.</p>
          <button className="btn btn-ghost" onClick={signOut}>Çıkış yap</button>
        </div>
      </main>
    );
  }
  return <Dashboard agent={agent} setAgent={setAgent} signOut={signOut} />;
}

function Dashboard({ agent, setAgent, signOut }) {
  const sb = getSupabase();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState('');
  const [rateFor, setRateFor] = useState(null); // { request, by, blocked }
  const [rating, setRating] = useState(0);
  const [notifPerm, setNotifPerm] = useState('default');
  const finishedIds = useRef(new Set());
  const activeRef = useRef(null);

  const load = useCallback(async () => {
    const { data, error } = await sb.from('chat_requests')
      .select('id, status, created_at, last_seen_at, accepted_at, channel_key')
      .eq('agent_id', agent.id).in('status', ['waiting', 'active'])
      .order('created_at', { ascending: true });
    if (error) { setErr('İstekler yüklenemedi.'); return; }
    setErr('');
    setRequests(data);
  }, [sb, agent.id]);

  const loadStats = useCallback(async () => {
    const { data } = await sb.rpc('agent_stats');
    if (data) setStats(data);
  }, [sb]);

  const finish = useCallback(({ request, by, blocked }) => {
    if (finishedIds.current.has(request.id)) return;
    finishedIds.current.add(request.id);
    setRating(0);
    setRateFor({ request, by, blocked });
    load(); loadStats();
  }, [load, loadStats]);

  const active = requests.find((r) => r.status === 'active');
  const waiting = requests.filter((r) => r.status === 'waiting');
  activeRef.current = active;

  useEffect(() => {
    load(); loadStats();
    if (typeof Notification !== 'undefined') setNotifPerm(Notification.permission);

    const ch = sb.channel(`agent-requests-${agent.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_requests', filter: `agent_id=eq.${agent.id}` }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'waiting') {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            try { new Notification('Dertleş · Yeni istek', { body: 'Bir ziyaretçi seninle dertleşmek istiyor.', icon: '/icon.svg', tag: 'dertles-request' }); } catch {}
          }
        }
        if (payload.eventType === 'UPDATE' && payload.new.status === 'ended' && payload.new.ended_by === 'visitor') {
          const a = activeRef.current;
          if (a && a.id === payload.new.id) finish({ request: a, by: 'visitor' });
        }
        load();
      })
      .subscribe();

    const poll = setInterval(load, 10000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { sb.removeChannel(ch); clearInterval(poll); clearInterval(tick); };
  }, [sb, agent.id, load, loadStats, finish]);

  // Panel açık ve çevrimiçiyken canlılık sinyali (sekme kapanırsa 2 dk içinde çevrimdışı görünür)
  useEffect(() => {
    if (!agent.is_online) return;
    const beat = () => sb.from('agents').update({ last_active_at: new Date().toISOString() }).eq('id', agent.id).then(() => {});
    beat();
    const t = setInterval(beat, 45000);
    return () => clearInterval(t);
  }, [sb, agent.id, agent.is_online]);

  // Sekme başlığında bekleyen sayısı
  useEffect(() => {
    document.title = waiting.length ? `(${waiting.length}) Panel · Dertleş` : 'Panel · Dertleş';
  }, [waiting.length]);

  async function toggleOnline() {
    const next = !agent.is_online;
    const ts = new Date().toISOString();
    const { error } = await sb.from('agents').update({ is_online: next, last_active_at: ts, updated_at: ts }).eq('id', agent.id);
    if (error) setErr(friendlyError(error));
    else setAgent({ ...agent, is_online: next });
  }

  async function accept(id) {
    setErr('');
    const { error } = await sb.rpc('agent_accept', { p_id: id });
    if (error) setErr(friendlyError(error));
    load();
  }

  async function decline(id) {
    await sb.rpc('agent_decline', { p_id: id });
    load();
  }

  async function submitRating() {
    if (rating && rateFor) await sb.rpc('agent_rate', { p_id: rateFor.request.id, p_rating: rating });
    setRateFor(null);
  }

  async function askNotif() {
    if (typeof Notification === 'undefined') return;
    setNotifPerm(await Notification.requestPermission());
  }

  return (
    <main className="panel">
      <header className="panel-top">
        <div className="panel-me">
          <Avatar name={agent.display_name} url={agent.avatar_url} size={48} />
          <div>
            <strong>{agent.display_name}</strong>
            <span className="small muted">Temsilci paneli</span>
          </div>
        </div>
        <div className="panel-actions">
          <button className={`switch ${agent.is_online ? 'on' : ''}`} onClick={toggleOnline} aria-pressed={agent.is_online}>
            <span className="track" /> <span>{agent.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
          </button>
          <a className="btn btn-ghost btn-sm" href="/panel/profil">Profilim</a>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Çıkış</button>
        </div>
      </header>

      {notifPerm === 'default' && (
        <div className="notice">
          <span>Yeni istek geldiğinde haber almak için tarayıcı bildirimlerini aç.</span>
          <button className="btn btn-primary btn-sm" onClick={askNotif}>Bildirimleri aç</button>
        </div>
      )}
      {notifPerm === 'denied' && (
        <div className="notice"><span>Bildirimler engellenmiş. Tarayıcı ayarlarından bu site için izin verebilirsin.</span></div>
      )}
      {!agent.is_online && waiting.length === 0 && !active && (
        <div className="notice"><span>Çevrimdışısın; ziyaretçiler sana yeni istek gönderemez.</span></div>
      )}
      {err && <p className="form-msg err">{err}</p>}

      <div className="panel-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="box">
            <h2>Bekleyenler <span className="count">{waiting.length}</span></h2>
            {waiting.length === 0 ? (
              <p className="muted small">Şu an bekleyen kimse yok.</p>
            ) : (
              <div className="queue">
                {waiting.map((r, i) => {
                  const stale = now - new Date(r.last_seen_at).getTime() > 45000;
                  return (
                    <div className="q-item" key={r.id}>
                      <div className="q-main">
                        <strong>{i + 1}. {visitorLabel(r.id)}</strong>
                        <span className="small muted">{since(r.created_at, now)} bekliyor</span>
                        {stale && <span className="small stale"> · sayfadan ayrılmış olabilir</span>}
                      </div>
                      <div className="q-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => decline(r.id)}>Reddet</button>
                        <button className="btn btn-primary btn-sm" disabled={!!active} onClick={() => accept(r.id)} title={active ? 'Önce mevcut sohbeti bitir' : ''}>Kabul et</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="box">
            <h2>İstatistiklerim</h2>
            <div className="stats">
              <div><b>{stats?.total ?? '–'}</b><span>görüşme</span></div>
              <div><b>{stats?.avg_rating ? `★ ${stats.avg_rating}` : '–'}</b><span>{stats?.rating_count || 0} puan</span></div>
              <div><b>{stats ? `${stats.avg_minutes} dk` : '–'}</b><span>ort. süre</span></div>
            </div>
          </section>
        </div>

        {active ? (
          <AgentChat key={active.id} request={active} onFinished={finish} />
        ) : (
          <section className="box">
            <div className="empty">
              <div className="big-emoji">☕</div>
              <strong>Aktif sohbet yok</strong>
              <span className="small">Bekleyenlerden birini kabul ettiğinde sohbet burada açılır. Aynı anda yalnızca bir sohbet alabilirsin.</span>
            </div>
          </section>
        )}
      </div>

      {rateFor && (
        <div className="modal-wrap">
          <div className="modal">
            <h3>{rateFor.blocked ? 'Ziyaretçi engellendi' : rateFor.by === 'visitor' ? 'Ziyaretçi sohbeti bitirdi' : 'Sohbet sona erdi'}</h3>
            <p className="muted">Bu görüşmeyi nasıl değerlendirirsin? (Yalnızca puan kaydedilir.)</p>
            <Stars value={rating} onChange={setRating} />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRateFor(null)}>Geç</button>
              <button className="btn btn-primary" disabled={!rating} onClick={submitRating}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
