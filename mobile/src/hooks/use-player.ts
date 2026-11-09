import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type Player = { id: string; display_name: string; total_xp: number; wins: number; losses: number; unlocked_enemy: number };
export function authMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return 'Correo o contraseña incorrectos.';
  if (code === 'email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (code === 'user_already_exists') return 'Ya existe una cuenta con ese correo.';
  if (code === 'weak_password') return 'La contraseña no cumple los requisitos del servidor.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (code === 'signup_disabled') return 'El registro no está disponible por el momento.';
  return 'No se pudo completar la solicitud. Revisa tu conexión y vuelve a intentar.';
}

export function usePlayer() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [resource, setResource] = useState<{ key: string; player: Player | null; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(supabase ? '' : 'El servicio no está disponible por el momento.');
  const [revision, setRevision] = useState(0);
  const operation = useRef(false);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    let observed = false;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      observed = true;
      if (live) { setSession(next); setReady(true); }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      if (error) setMessage(authMessage(error));
      if (!observed) setSession(data.session);
      setReady(true);
    }).catch((error: unknown) => { if (live) { setMessage(authMessage(error)); setReady(true); } });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  const userId = session?.user.id;
  const resourceKey = `${userId}:${revision}`;
  useEffect(() => {
    if (!userId || !supabase) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let live = true;
    const client = supabase;
    void (async () => {
      try {
        const [profile, progress] = await Promise.all([
          client.from('profiles').select('id,display_name').eq('id', userId).abortSignal(controller.signal).single(),
          client.from('player_progress').select('total_xp,wins,losses,unlocked_enemy').eq('user_id', userId).abortSignal(controller.signal).single(),
        ]);
        if (profile.error || progress.error) throw profile.error || progress.error;
        if (live) setResource({ key: resourceKey, player: { ...profile.data, ...progress.data }, error: '' });
      } catch { if (live) setResource({ key: resourceKey, player: null, error: 'No pudimos cargar tu perfil. Revisa tu conexión y vuelve a intentarlo.' }); }
      finally { clearTimeout(timer); }
    })();
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [userId, resourceKey]);

  async function authenticate(email: string, password: string, register = false) {
    if (!supabase || operation.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('Escribe un correo válido.'); return; }
    if (!password) { setMessage('Escribe tu contraseña.'); return; }
    if (register && password.length < 8) { setMessage('Para registrarte usa una contraseña de al menos 8 caracteres.'); return; }
    operation.current = true; setBusy(true); setMessage('');
    try {
      const result = register
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (register && !result.data.session) setMessage('Revisa tu correo para confirmar la cuenta. Después vuelve e inicia sesión. Si ya tenías cuenta, utiliza Iniciar sesión.');
      return true;
    } catch (error) { setMessage(authMessage(error)); return false; }
    finally { operation.current = false; setBusy(false); }
  }
  async function signOut() {
    if (!supabase || operation.current) return;
    operation.current = true; setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setSession(null); setResource(null);
    } catch (error) { setMessage(authMessage(error)); }
    finally { operation.current = false; setBusy(false); }
  }
  const current = resource?.key === resourceKey ? resource : null;
  return { session, ready, player: userId ? current?.player ?? null : null, loading: !!userId && !current, busy, message: message || (userId ? current?.error ?? '' : ''),
    authenticate, signOut, refresh: () => setRevision((value) => value + 1) };
}
