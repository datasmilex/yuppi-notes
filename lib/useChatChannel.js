'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from './supabase';

// Mesajlar yalnızca bellekte tutulur ve Realtime Broadcast ile iletilir.
// Hiçbir mesaj veritabanına yazılmaz; sayfa kapanınca kaybolur.
export function useChatChannel(channelKey, role, { onEnded, onAccepted } = {}) {
  const [messages, setMessages] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [readUpTo, setReadUpTo] = useState(null); // karşı tarafın okuduğu son mesaj id'si
  const [connected, setConnected] = useState(false);
  const channelRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const cbRef = useRef({ onEnded, onAccepted });
  cbRef.current = { onEnded, onAccepted };

  const sendRead = useCallback((list) => {
    const ch = channelRef.current;
    if (!ch || typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    const lastOther = [...list].reverse().find((m) => m.from !== role);
    if (lastOther) ch.send({ type: 'broadcast', event: 'read', payload: { id: lastOther.id, from: role } });
  }, [role]);

  useEffect(() => {
    if (!channelKey) return;
    const sb = getSupabase();
    const ch = sb.channel(`chat:${channelKey}`, { config: { broadcast: { self: false, ack: true } } });

    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (!payload || payload.from === role) return;
      setOtherTyping(false);
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        const next = [...prev, { id: payload.id, from: payload.from, text: String(payload.text).slice(0, 2000), at: payload.at }];
        setTimeout(() => sendRead(next), 0);
        return next;
      });
    })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.from === role) return;
        setOtherTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setOtherTyping(false), 3500);
      })
      .on('broadcast', { event: 'read' }, ({ payload }) => {
        if (payload?.from === role) return;
        setReadUpTo(payload.id);
      })
      .on('broadcast', { event: 'ended' }, ({ payload }) => {
        if (payload?.from === role) return;
        cbRef.current.onEnded?.(payload);
      })
      .on('broadcast', { event: 'accepted' }, () => cbRef.current.onAccepted?.())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    channelRef.current = ch;

    const onVis = () => setMessages((m) => { sendRead(m); return m; });
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(typingTimer.current);
      sb.removeChannel(ch);
      channelRef.current = null;
    };
  }, [channelKey, role, sendRead]);

  const send = useCallback(async (text) => {
    const clean = text.trim().slice(0, 2000);
    if (!clean || !channelRef.current) return;
    const msg = { id: crypto.randomUUID(), from: role, text: clean, at: Date.now() };
    setMessages((prev) => [...prev, { ...msg, pending: true }]);
    const res = await channelRef.current.send({ type: 'broadcast', event: 'msg', payload: msg });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pending: false, failed: res !== 'ok' } : m)));
  }, [role]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000 || !channelRef.current) return;
    lastTypingSent.current = now;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { from: role } });
  }, [role]);

  const broadcast = useCallback((event, payload = {}) => {
    channelRef.current?.send({ type: 'broadcast', event, payload: { ...payload, from: role } });
  }, [role]);

  const reset = useCallback(() => { setMessages([]); setReadUpTo(null); setOtherTyping(false); }, []);

  return { messages, send, notifyTyping, otherTyping, readUpTo, connected, broadcast, reset };
}
