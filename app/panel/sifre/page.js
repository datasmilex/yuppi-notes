'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';

// Şifre sıfırlama / davet bağlantısının açıldığı sayfa
export default function PasswordPage() {
  const sb = getSupabase();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) { setMsg({ type: 'err', text: 'Şifre en az 8 karakter olmalı.' }); return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) setMsg({ type: 'err', text: friendlyError(error) });
    else { setMsg({ type: 'ok', text: 'Şifren kaydedildi, panele yönlendiriliyorsun…' }); setTimeout(() => (location.href = '/panel'), 1200); }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Yeni şifre belirle</h1>
        {!ready ? (
          <p className="muted">Bağlantı doğrulanıyor… Bu sayfayı e-postandaki bağlantıdan açtığından emin ol.</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="pw">Yeni şifre</label>
              <input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <button className="btn btn-primary">Kaydet</button>
          </>
        )}
        {msg && <p className={`form-msg ${msg.type}`}>{msg.text}</p>}
      </form>
    </main>
  );
}
