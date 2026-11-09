'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from './supabase';

export function useAgentAuth() {
  const sb = getSupabase();
  const [session, setSession] = useState(undefined); // undefined = yükleniyor
  const [agent, setAgent] = useState(null);

  const loadAgent = useCallback(async (uid) => {
    if (!uid) { setAgent(null); return; }
    const { data } = await sb.from('agents').select('*').eq('id', uid).maybeSingle();
    setAgent(data || false);
  }, [sb]);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); loadAgent(data.session?.user.id); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); loadAgent(s?.user.id); });
    return () => sub.subscription.unsubscribe();
  }, [sb, loadAgent]);

  const signOut = useCallback(async () => {
    if (agent) await sb.from('agents').update({ is_online: false }).eq('id', agent.id);
    await sb.auth.signOut();
  }, [sb, agent]);

  return { session, agent, setAgent, reloadAgent: () => loadAgent(session?.user.id), signOut };
}
