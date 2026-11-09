import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/services/supabase';

const modes = [
  { id: 'easy', name: 'Fácil', description: '80 % fáciles y 20 % medias.' },
  { id: 'normal', name: 'Normal', description: '40 % fáciles, 50 % medias y 10 % difíciles.' },
  { id: 'hard', name: 'Difícil', description: '20 % medias y 80 % difíciles.' },
  { id: 'adaptive', name: 'Adaptativo', description: 'Comienza en fácil. Por categoría: 3 aciertos seguidos suben un nivel y 2 errores seguidos lo bajan.' },
] as const;
type Mode = typeof modes[number]['id'];
type Category = { id: number; name: string };
type Preferences = { category_ids: number[]; question_mode: Mode };
const validMode = (value: unknown): value is Mode => modes.some(mode => mode.id === value);

export function LearningPreferences({ userId,onSaved,saveLabel='GUARDAR PREPARACIÓN' }: { userId: string;onSaved?:()=>void;saveLabel?:string }) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>('adaptive');
  const [saved, setSaved] = useState<Preferences | null>(null);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let live = true;
    void (async () => {
      try {
        const [catalog, interests, profile] = await Promise.all([
          client.from('categories').select('id,name').order('id').abortSignal(controller.signal),
          client.from('user_interests').select('category_id').eq('user_id', userId).abortSignal(controller.signal),
          client.from('profiles').select('question_mode').eq('id', userId).abortSignal(controller.signal).single(),
        ]);
        if (catalog.error || interests.error || profile.error) throw catalog.error || interests.error || profile.error;
        if (!validMode(profile.data.question_mode) || !catalog.data.length) throw new Error('Preferencias inválidas');
        if (live) {
          const ids = interests.data.map(row => row.category_id as number);
          setCategories(catalog.data); setSelected(ids); setMode(profile.data.question_mode);
          setSaved({ category_ids: ids, question_mode: profile.data.question_mode });
          setLoadError(false); setMessage('');
        }
      } catch {
        if (live) { setLoadError(true); setMessage('No pudimos cargar tus intereses. Revisa tu conexión y vuelve a intentarlo.'); }
      } finally { clearTimeout(timer); }
    })();
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [userId, revision]);

  async function save() {
    if (!supabase || saving.current) return;
    if (!selected.length) { setMessage('Selecciona al menos un interés.'); return; }
    saving.current = true; setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.rpc('save_learning_preferences', {
        p_category_ids: selected, p_question_mode: mode,
      }).abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      if (!data || !Array.isArray(data.category_ids) || !validMode(data.question_mode)) throw new Error('Respuesta inválida');
      if (mounted.current) {
        setSelected(data.category_ids); setMode(data.question_mode); setSaved(data);
        setMessage('Preferencias guardadas.');
        onSaved?.();
      }
    } catch {
      if (mounted.current) setMessage('No se confirmó el guardado. Revisa tu conexión y vuelve a guardar la misma selección; no se duplicará.');
    } finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  const dirty = !!saved && (saved.question_mode !== mode || [...selected].sort().join(',') !== [...saved.category_ids].sort().join(','));
  if (!categories) return <View style={styles.panel}>
    <Text style={styles.title}>TUS AFINIDADES</Text>
    {loadError ? <><Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setLoadError(false); setRevision(value => value + 1); }}><Text style={styles.buttonText}>REINTENTAR</Text></Pressable></>
      : <ActivityIndicator accessibilityLabel="Cargando preferencias" color="#43BFA0" />}
  </View>;
  return <View style={styles.panel}>
    <Text style={styles.title}>01 · TUS AFINIDADES</Text>
    <Text style={styles.text}>Elige los temas que alimentan tu aventura. Tus desafíos usarán estas categorías.</Text>
    <View style={styles.categories}>{categories.map(category => {
      const checked = selected.includes(category.id);
      return <Pressable key={category.id} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: busy }} disabled={busy}
        onPress={() => { setMessage(''); setSelected(ids => checked ? ids.filter(id => id !== category.id) : [...ids, category.id]); }}
        style={[styles.chip, checked && styles.chosen]}>
        <Text style={styles.text}>{checked ? '✓ ' : '+ '}{category.name}</Text>
      </Pressable>;
    })}</View>
    <Text style={styles.muted}>{selected.length} seleccionadas · mínimo 1</Text>
    <Text style={styles.title}>02 · NIVEL DEL DESAFÍO</Text>
    <Text style={styles.muted}>Este modo solo afecta a las preguntas. Los enemigos mantienen sus estadísticas.</Text>
    <View accessibilityRole="radiogroup">{modes.map(option => <Pressable key={option.id} accessibilityRole="radio"
      accessibilityState={{ checked: mode === option.id, disabled: busy }} disabled={busy}
      onPress={() => { setMode(option.id); setMessage(''); }} style={[styles.mode, mode === option.id && styles.chosen]}>
      <Text style={styles.text}>{mode === option.id ? '● ' : '○ '}{option.name}{option.id === 'adaptive' ? ' · recomendado' : ''}</Text>
      <Text style={styles.muted}>{option.description}</Text>
    </Pressable>)}</View>
    <Text style={styles.muted}>{dirty ? 'Tienes cambios sin guardar.' : saved?.category_ids.length ? 'Tu selección está guardada.' : 'Elige tus intereses para comenzar.'}</Text>
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !selected.length }} disabled={busy || !selected.length}
      onPress={() => void save()} style={[styles.button, (busy || !selected.length) && styles.disabled]}>
      <Text style={styles.buttonText}>{busy ? 'GUARDANDO…' : saveLabel}</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  panel: { gap: 16, padding: 20, borderWidth: 1, borderColor: '#41425f', backgroundColor: '#191e32',borderRadius:16 },
  title: { color: '#E9B949', fontWeight: 'bold', letterSpacing: 1 }, text: { color: '#f0ebff', lineHeight: 23 },
  muted: { color: '#bcb6cf', fontSize: 12, lineHeight: 20 }, message: { color: '#E9B949', lineHeight: 23 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, chip: { minHeight: 48, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#414860', backgroundColor: '#151a2b',borderRadius:10 },
  chosen: { borderColor: '#8d75c3', backgroundColor: '#322b4a' }, mode: { padding: 16, borderWidth: 1, borderColor: '#414860', gap: 6, marginBottom: 10,borderRadius:12 },
  button: { backgroundColor: '#E9B949', padding: 17,borderRadius:11,borderBottomWidth:3,borderColor:'#a9752e' }, buttonText: { color: '#292332', textAlign: 'center', fontWeight: 'bold' }, disabled: { opacity: 0.5 },
});
