'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import ChatView from './ChatView';
import Stars from './Stars';
import { getSupabase } from '@/lib/supabase';
import { useChatChannel } from '@/lib/useChatChannel';
import { clearSession } from '@/lib/device';

function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function VisitorSession({ session, onExit }) {
  const sb = getSupabase();
  const { agent } = session;
  const [info, setInfo] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [rated, setRated] = useState(0);
  const [lost, setLost] = useState(false);
  const statusRef = useRef(null);

  const refresh = useCallback(async () => {
    const { data, error } = await sb.rpc('get_request_status', { p_id: session.id, p_token: session.token });
    if (error) { setLost(true); return; }
    setLost(false);
    setInfo(data);
    statusRef.current = data.status;
  }, [sb, session.id, session.token]);

  const chat = useChatChannel(session.channelKey, 'visitor', { onEnded: refresh, onAccepted: refresh });

  useEffect(() => {
    refresh();
    const poll = setInterval(() => {
      if (['waiting', 'active'].includes(statusRef.current) || !statusRef.current) refresh();
    }, 4000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [refresh]);

  // Aktif sohbetteyken sayfayı kapatmadan önce uyar
  useEffect(() => {
    const status = info?.status;
    if (status !== 'active' && status !== 'waiting') return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [info?.status]);

  async function cancel() {
    await sb.rpc('visitor_cancel', { p_id: session.id, p_token: session.token });
    exit();
  }

  async function end() {
    setConfirmEnd(false);
    await sb.rpc('visitor_end', { p_id: session.id, p_token: session.token });
    chat.broadcast('ended', { by: 'visitor' });
    refresh();
  }

  async function rate(n) {
    setRated(n);
    await sb.rpc('visitor_rate', { p_id: session.id, p_token: session.token, p_rating: n });
  }

  function exit() {
    clearSession();
    onExit();
  }

  const status = info?.status;

  return (
    <div className="session">
      <header className="session-head">
        <Avatar name={agent.display_name} url={agent.avatar_url} size={40} />
        <div className="session-title">
          <strong>{agent.display_name}{(info?.adult || agent.is_adult) && <span className="adult-badge">+18</span>}</strong>
          <span className="muted small">
            {status === 'active' ? (chat.otherTyping ? 'yazıyor…' : 'Sohbette') : status === 'waiting' ? 'İsteğin iletildi' : 'Görüşme'}
          </span>
        </div>
        {status === 'active' && (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(true)}>Sohbeti bitir</button>
        )}
      </header>

      {lost && <p className="alert slim">Bağlantı sorunu, yeniden deneniyor…</p>}

      {!info && !lost && <div className="center-box"><div className="spinner" /></div>}

      {status === 'waiting' && (
        <div className="center-box waiting">
          <div className="pulse"><Avatar name={agent.display_name} url={agent.avatar_url} size={96} /></div>
          <h2>{agent.display_name} birazdan seninle olacak</h2>
          <p className="muted">İsteğin iletildi. Kabul edildiğinde sohbet otomatik başlar, bu sayfayı açık tut.</p>
          <div className="wait-stats">
            <div><b>{info.ahead + 1}.</b><span>sıradasın</span></div>
            <div><b>{info.est_minutes > 0 ? `~${info.est_minutes} dk` : 'Az kaldı'}</b><span>tahmini</span></div>
            <div><b>{mmss(now - new Date(info.created_at).getTime())}</b><span>bekliyorsun</span></div>
          </div>
          {info.busy && <p className="muted small">{agent.display_name} şu an başka bir sohbette.</p>}
          <button className="btn btn-ghost" onClick={cancel}>Vazgeç</button>
        </div>
      )}

      {status === 'active' && (
        <ChatView
          role="visitor"
          messages={chat.messages}
          onSend={chat.send}
          onTyping={chat.notifyTyping}
          otherTyping={chat.otherTyping}
          readUpTo={chat.readUpTo}
          otherName={agent.display_name}
          disabled={!chat.connected}
          placeholder={chat.connected ? 'İçinden geçenleri yaz…' : 'Bağlanıyor…'}
        />
      )}

      {status === 'ended' && (
        <div className="center-box">
          <div className="big-emoji">🤍</div>
          <h2>{info.ended_by === 'agent' ? `${agent.display_name} sohbeti sonlandırdı` : 'Sohbet sona erdi'}</h2>
          <p className="muted">Mesajların hiçbir yerde saklanmadı. Kendine iyi bak.</p>
          {info.visitor_rating || rated ? (
            <p className="thanks">Değerlendirmen için teşekkürler!</p>
          ) : (
            <div className="rate-box">
              <p>{agent.display_name} ile görüşmeni nasıl değerlendirirsin?</p>
              <Stars value={rated} onChange={rate} />
            </div>
          )}
          <button className="btn btn-primary" onClick={exit}>Ana sayfaya dön</button>
        </div>
      )}

      {(status === 'declined' || status === 'cancelled') && (
        <div className="center-box">
          <div className="big-emoji">🌿</div>
          <h2>{status === 'declined' ? `${agent.display_name} şu an bu isteği kabul edemedi` : 'İstek iptal edildi'}</h2>
          <p className="muted">Biraz sonra tekrar deneyebilir ya da başka bir temsilci seçebilirsin.</p>
          <button className="btn btn-primary" onClick={exit}>Ana sayfaya dön</button>
        </div>
      )}

      {confirmEnd && (
        <div className="modal-wrap">
          <div className="modal">
            <h3>Sohbeti bitirmek istiyor musun?</h3>
            <p className="muted">Mesajlar kaydedilmediği için sohbet tamamen silinir.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmEnd(false)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={end}>Bitir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
