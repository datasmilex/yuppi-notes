'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';

export default function LoginForm() {
  const sb = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function login(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg({ type: 'err', text: friendlyError(error) });
  }

  async function reset() {
    if (!email.trim()) { setMsg({ type: 'err', text: 'Önce e-posta adresini yaz.' }); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/panel/sifre` });
    setMsg(error ? { type: 'err', text: friendlyError(error) } : { type: 'ok', text: 'Şifre sıfırlama bağlantısı e-postana gönderildi.' });
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={login}>
        <div className="brand"><img src="/icon.svg" alt="" width={32} height={32} /> Dertleş</div>
        <h1>Temsilci girişi</h1>
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">Şifre</label>
          <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p className={`form-msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
        <button type="button" className="link small" onClick={reset}>Şifremi unuttum</button>
        <a href="/" className="small muted">← Ana sayfa</a>
      </form>
    </main>
  );
}
