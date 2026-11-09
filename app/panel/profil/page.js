'use client';
import { useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';
import LoginForm from '@/components/LoginForm';
import { getSupabase } from '@/lib/supabase';
import { useAgentAuth } from '@/lib/useAgentAuth';
import { DAYS } from '@/lib/schedule';
import { friendlyError } from '@/lib/errors';

export default function ProfilePage() {
  const { session, agent, setAgent } = useAgentAuth();
  if (session === undefined || (session && agent === null)) return <main className="auth"><div className="spinner" /></main>;
  if (!session) return <LoginForm />;
  if (!agent || !agent.approved) return <main className="auth"><a href="/panel">Panele dön</a></main>;
  return <ProfileForm agent={agent} setAgent={setAgent} />;
}

function ProfileForm({ agent, setAgent }) {
  const sb = getSupabase();
  const [name, setName] = useState(agent.display_name);
  const [bio, setBio] = useState(agent.bio || '');
  const [tags, setTags] = useState((agent.tags || []).join(', '));
  const [schedule, setSchedule] = useState(agent.schedule || {});
  const [avatar, setAvatar] = useState(agent.avatar_url);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pw, setPw] = useState('');

  useEffect(() => { document.title = 'Profilim · Dertleş'; }, []);

  function setDay(key, patch) {
    setSchedule((s) => {
      const cur = s[key] || { start: '10:00', end: '18:00' };
      const next = { ...cur, ...patch };
      const copy = { ...s };
      if (patch.closed) delete copy[key]; else copy[key] = { start: next.start, end: next.end };
      return copy;
    });
  }

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) {
      setMsg({ type: 'err', text: 'Lütfen 3 MB’tan küçük bir görsel seç.' });
      return;
    }
    setBusy(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${agent.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    setBusy(false);
    if (error) { setMsg({ type: 'err', text: 'Fotoğraf yüklenemedi.' }); return; }
    setAvatar(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) { setMsg({ type: 'err', text: 'İsim boş olamaz.' }); return; }
    setBusy(true); setMsg(null);
    const patch = {
      display_name: name.trim().slice(0, 40),
      bio: bio.trim().slice(0, 300),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8).map((t) => t.slice(0, 24)),
      schedule,
      avatar_url: avatar || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('agents').update(patch).eq('id', agent.id);
    setBusy(false);
    if (error) setMsg({ type: 'err', text: friendlyError(error) });
    else { setAgent({ ...agent, ...patch }); setMsg({ type: 'ok', text: 'Profilin kaydedildi.' }); }
  }

  async function changePw(e) {
    e.preventDefault();
    if (pw.length < 8) { setMsg({ type: 'err', text: 'Şifre en az 8 karakter olmalı.' }); return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    setPw('');
    setMsg(error ? { type: 'err', text: friendlyError(error) } : { type: 'ok', text: 'Şifren güncellendi.' });
  }

  return (
    <main className="profile">
      <header className="panel-top">
        <a className="btn btn-ghost btn-sm" href="/panel">← Panel</a>
        <strong>Profilim</strong>
      </header>

      <form className="box" onSubmit={save} style={{ display: 'grid', gap: 16 }}>
        <div className="avatar-edit">
          <Avatar name={name || '?'} url={avatar} size={84} />
          <div style={{ display: 'grid', gap: 6 }}>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              Fotoğraf seç
              <input type="file" accept="image/*" hidden onChange={upload} />
            </label>
            {avatar && <button type="button" className="link small" onClick={() => setAvatar(null)}>Fotoğrafı kaldır</button>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="name">Görünen ad</label>
          <input id="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="bio">Hakkımda</label>
          <textarea id="bio" value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="Ziyaretçilere kendinden kısaca bahset…" />
          <span className="hint">{bio.length}/300</span>
        </div>

        <div className="field">
          <label htmlFor="tags">Özellikler / konular</label>
          <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="İlişkiler, Aile, Okul stresi, İyi bir dinleyici" />
          <span className="hint">Virgülle ayır, en fazla 8 tane. Kartında etiket olarak görünür.</span>
        </div>

        <div className="field">
          <label>Çalışma saatleri <span className="hint">(Türkiye saati)</span></label>
          <div className="sched">
            {DAYS.map((d) => {
              const slot = schedule[d.key];
              return (
                <div className="sched-row" key={d.key}>
                  <strong>{d.label}</strong>
                  <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={!!slot} onChange={(e) => setDay(d.key, e.target.checked ? {} : { closed: true })} />
                    Açık
                  </label>
                  <div className="times">
                    {slot ? (
                      <>
                        <input type="time" value={slot.start} onChange={(e) => setDay(d.key, { start: e.target.value })} aria-label={`${d.label} başlangıç`} />
                        <span>–</span>
                        <input type="time" value={slot.end} onChange={(e) => setDay(d.key, { end: e.target.value })} aria-label={`${d.label} bitiş`} />
                      </>
                    ) : <span className="muted small">Kapalı</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {msg && <p className={`form-msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </form>

      <form className="box" onSubmit={changePw} style={{ display: 'grid', gap: 12 }}>
        <h2>Şifre değiştir</h2>
        <div className="field">
          <label htmlFor="npw">Yeni şifre</label>
          <input id="npw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <button className="btn btn-ghost">Şifreyi güncelle</button>
      </form>
    </main>
  );
}
