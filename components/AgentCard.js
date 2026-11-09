'use client';
import { useState } from 'react';
import Avatar from './Avatar';
import { DAYS, hoursText, todayKey, todayText } from '@/lib/schedule';

export function agentStatus(a) {
  if (!a.is_online) return { key: 'offline', label: 'Çevrimdışı' };
  if (a.busy) return { key: 'busy', label: 'Sohbette' };
  return { key: 'available', label: 'Müsait' };
}

export function estimate(a) {
  const ahead = a.waiting_count + (a.busy ? 1 : 0);
  if (ahead === 0) return 'Hemen bağlanabilirsin';
  return `${a.waiting_count} kişi bekliyor · ~${Math.ceil(ahead * Number(a.avg_minutes))} dk`;
}

export default function AgentCard({ agent, onConnect, connecting }) {
  const [open, setOpen] = useState(false);
  const st = agentStatus(agent);
  const today = todayKey();

  return (
    <article className={`agent-card ${st.key}`}>
      <div className="agent-head">
        <Avatar name={agent.display_name} url={agent.avatar_url} size={60} />
        <div className="agent-info">
          <div className="agent-name-row">
            <h3>{agent.display_name}</h3>
            <span className={`pill ${st.key}`}><i />{st.label}</span>
          </div>
          <div className="agent-sub">
            {agent.rating_count > 0 ? <span>★ {Number(agent.avg_rating).toFixed(1)} <small>({agent.rating_count})</small></span> : <span className="muted">Henüz puan yok</span>}
            <span className="dot">·</span>
            <button type="button" className="link" onClick={() => setOpen((o) => !o)}>{todayText(agent.schedule)} {open ? '▴' : '▾'}</button>
          </div>
        </div>
      </div>

      {agent.bio && <p className="agent-bio">{agent.bio}</p>}
      {agent.tags?.length > 0 && (
        <div className="tags">{agent.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
      )}

      {open && (
        <ul className="week">
          {DAYS.map((d) => (
            <li key={d.key} className={d.key === today ? 'today' : ''}>
              <span>{d.label}</span><span>{hoursText(agent.schedule?.[d.key])}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="agent-foot">
        <span className="muted small">{agent.is_online ? estimate(agent) : 'Çalışma saatlerinde tekrar uğra'}</span>
        <button className="btn btn-primary" disabled={!agent.is_online || connecting} onClick={() => onConnect(agent)}>
          {connecting ? 'Bağlanıyor…' : agent.is_online ? 'Bağlan' : 'Çevrimdışı'}
        </button>
      </div>
    </article>
  );
}
