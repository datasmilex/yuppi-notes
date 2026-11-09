'use client';
import { useEffect, useRef, useState } from 'react';
import ChatView from './ChatView';
import { useChatChannel } from '@/lib/useChatChannel';
import { getSupabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';

export function visitorLabel(id) {
  return `Ziyaretçi #${id.slice(0, 4).toUpperCase()}`;
}

export default function AgentChat({ request, onFinished }) {
  const sb = getSupabase();
  const chat = useChatChannel(request.channel_key, 'agent', {
    onEnded: () => onFinished({ request, by: 'visitor' }),
  });
  const [confirm, setConfirm] = useState(null); // 'end' | 'block'
  const [blockHours, setBlockHours] = useState(24);
  const [err, setErr] = useState('');
  const announced = useRef(false);

  // Bağlanınca ziyaretçiye "kabul edildi" sinyali gönder (ziyaretçi ayrıca yoklama da yapar)
  useEffect(() => {
    if (chat.connected && !announced.current) {
      announced.current = true;
      chat.broadcast('accepted');
    }
  }, [chat.connected, chat]);

  useEffect(() => {
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  async function end() {
    setConfirm(null);
    const { error } = await sb.rpc('agent_end', { p_id: request.id });
    if (error) { setErr(friendlyError(error)); return; }
    chat.broadcast('ended', { by: 'agent' });
    onFinished({ request, by: 'agent' });
  }

  async function block() {
    setConfirm(null);
    const { error } = await sb.rpc('agent_block', { p_id: request.id, p_hours: blockHours });
    if (error) { setErr(friendlyError(error)); return; }
    chat.broadcast('ended', { by: 'agent' });
    onFinished({ request, by: 'agent', blocked: true });
  }

  const stale = Date.now() - new Date(request.last_seen_at).getTime() > 45000;

  return (
    <section className="box active-chat">
      <div className="active-head">
        <div className="grow">
          <strong>{visitorLabel(request.id)}</strong>
          <div className="small muted">
            {chat.otherTyping ? 'yazıyor…' : stale ? <span className="stale">Bağlantısı kopmuş olabilir</span> : chat.connected ? 'Bağlı' : 'Bağlanıyor…'}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setConfirm('block')}>Engelle</button>
        <button className="btn btn-primary btn-sm" onClick={() => setConfirm('end')}>Sohbeti bitir</button>
      </div>
      {err && <p className="alert slim">{err}</p>}
      <ChatView
        role="agent"
        messages={chat.messages}
        onSend={chat.send}
        onTyping={chat.notifyTyping}
        otherTyping={chat.otherTyping}
        readUpTo={chat.readUpTo}
        otherName="Ziyaretçi"
        disabled={!chat.connected}
      />

      {confirm === 'end' && (
        <div className="modal-wrap">
          <div className="modal">
            <h3>Sohbeti bitir?</h3>
            <p className="muted">Mesajlar kaydedilmediği için sohbet tamamen silinir.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={end}>Bitir</button>
            </div>
          </div>
        </div>
      )}
      {confirm === 'block' && (
        <div className="modal-wrap">
          <div className="modal">
            <h3>Ziyaretçiyi engelle</h3>
            <p className="muted">Sohbet sonlanır ve bu cihaz seçtiğin süre boyunca hiçbir temsilciye istek gönderemez.</p>
            <div className="field">
              <label htmlFor="bh">Süre</label>
              <select id="bh" value={blockHours} onChange={(e) => setBlockHours(Number(e.target.value))}>
                <option value={1}>1 saat</option>
                <option value={24}>1 gün</option>
                <option value={168}>1 hafta</option>
                <option value={720}>30 gün</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Vazgeç</button>
              <button className="btn btn-danger" onClick={block}>Engelle</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
