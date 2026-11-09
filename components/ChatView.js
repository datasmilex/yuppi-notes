'use client';
import { useEffect, useRef, useState } from 'react';

const EMOJIS = ['🙂', '😊', '🥲', '😢', '😭', '😔', '😞', '😟', '😤', '😅', '🤗', '🫂', '❤️', '🤍', '🙏', '👍', '👏', '✨', '🌿', '☕', '🌙', '💪', '🤔', '😌'];

function time(at) {
  return new Date(at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({ role, messages, onSend, onTyping, otherTyping, readUpTo, otherName, disabled, placeholder }) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, otherTyping]);

  const readIndex = readUpTo ? messages.findIndex((m) => m.id === readUpTo) : -1;
  let lastMine = -1;
  messages.forEach((m, i) => { if (m.from === role) lastMine = i; });

  function submit(e) {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
    setEmojiOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="chat">
      <div className="chat-scroll">
        <p className="chat-note">🔒 Mesajlar kaydedilmez. Sohbet bitince ya da sayfa kapanınca kaybolur.</p>
        {messages.map((m, i) => {
          const mine = m.from === role;
          return (
            <div key={m.id} className={`bubble-row ${mine ? 'mine' : ''}`}>
              <div className={`bubble ${mine ? 'mine' : ''} ${m.failed ? 'failed' : ''}`}>
                <span className="bubble-text">{m.text}</span>
                <span className="bubble-meta">
                  {time(m.at)}
                  {mine && (m.failed ? ' · iletilemedi' : m.pending ? ' · …' : i <= readIndex ? ' · ✓✓' : ' · ✓')}
                </span>
              </div>
              {mine && i === lastMine && i <= readIndex && <span className="seen">Görüldü</span>}
            </div>
          );
        })}
        {otherTyping && (
          <div className="bubble-row">
            <div className="bubble typing" aria-label={`${otherName} yazıyor`}>
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {emojiOpen && (
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => { setText((t) => t + e); inputRef.current?.focus(); }}>{e}</button>
          ))}
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        <button type="button" className="icon-btn" aria-label="Emoji" onClick={() => setEmojiOpen((o) => !o)} disabled={disabled}>🙂</button>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          maxLength={2000}
          disabled={disabled}
          placeholder={placeholder || 'Bir şeyler yaz…'}
          onChange={(e) => { setText(e.target.value); onTyping?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
        />
        <button type="submit" className="send-btn" disabled={disabled || !text.trim()} aria-label="Gönder">➤</button>
      </form>
    </div>
  );
}
