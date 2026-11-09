'use client';
import { useEffect, useState } from 'react';
import AgentCard from './AgentCard';
import { getSupabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/device';
import { friendlyError } from '@/lib/errors';

export default function AgentSheet({ open, onClose, onStarted }) {
  const [agents, setAgents] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      const { data, error } = await getSupabase().rpc('get_agents_public');
      if (!alive) return;
      if (error) setError('Temsilciler yüklenemedi.');
      else { setAgents(data); setError(''); }
    };
    load();
    const t = setInterval(load, 8000);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { alive = false; clearInterval(t); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  async function connect(agent) {
    setConnecting(agent.id);
    setError('');
    const { data, error } = await getSupabase().rpc('create_request', { p_agent: agent.id, p_device: getDeviceId() });
    setConnecting(null);
    if (error || !data?.[0]) { setError(friendlyError(error)); return; }
    const row = data[0];
    onStarted({ id: row.request_id, token: row.token, channelKey: row.channel_key, agent: { id: agent.id, display_name: agent.display_name, avatar_url: agent.avatar_url } });
  }

  return (
    <div className={`sheet-wrap ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Temsilci seç">
        <div className="sheet-handle" />
        <header className="sheet-head">
          <div>
            <h2>Kiminle dertleşmek istersin?</h2>
            <p className="muted small">Birini seç, isteğin ona iletilsin.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">✕</button>
        </header>
        {error && <p className="alert">{error}</p>}
        <div className="sheet-body">
          {!agents && !error && [0, 1, 2].map((i) => <div key={i} className="agent-card skeleton" />)}
          {agents?.length === 0 && <p className="muted center">Şu an listelenen temsilci yok.</p>}
          {agents?.map((a) => (
            <AgentCard key={a.id} agent={a} onConnect={connect} connecting={connecting === a.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
