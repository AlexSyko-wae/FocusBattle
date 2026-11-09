import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/services/supabase';
type Question = { id: string; category: string; difficulty: number; prompt: string; options: string[];
  answered: boolean; selected_index: number | null; correct: boolean | null; correct_index: number | null; explanation: string | null };
export function QuestionCard({ battleId, version, disabled, onAnswer,onContinue,energyEnabled=false }: {
  battleId: string; version: string; disabled: boolean; onAnswer: (questionId: string, option: number) => void;onContinue:()=>void;energyEnabled?:boolean;
}) {
  const [resource, setResource] = useState<{ key: string; question: Question | null; error: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  const key = `${battleId}:${version}:${revision}`;
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    void (async () => {
      try {
        const { data, error } = await supabase!.rpc('get_battle_question', { p_battle_id: battleId }).abortSignal(controller.signal);
        if (error) throw error;
        if (live) setResource({ key, question: data as Question | null, error: false });
      } catch { if (live) setResource({ key, question: null, error: true }); }
      finally { clearTimeout(timer); }
    })();
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [battleId,key]);
  const current = resource?.key === key ? resource : null;
  if (!current) return <ActivityIndicator color="#E9B949" accessibilityLabel="Cargando desafío" />;
  if (current.error) return <View style={styles.card}><Text style={styles.text}>No se pudo recuperar la pregunta o explicación.</Text>
    <Pressable accessibilityRole="button" onPress={() => setRevision(value => value+1)} style={styles.option}><Text style={styles.text}>REINTENTAR PREGUNTA</Text></Pressable></View>;
  const q = current.question;
  if (!q) return null;
  return <View style={styles.card}>
    <Text style={styles.title}>DESAFÍO · {q.category}</Text>
    <Text style={styles.muted}>{['','Fácil','Media','Difícil'][q.difficulty]}</Text>
    {!q.answered&&<View style={styles.stakes}><Text style={styles.reward}>✓ Acierto: +15 al próximo ataque{energyEnabled?' y +1 energía':''}.</Text><Text style={styles.risk}>✕ Error: +10 al contraataque pendiente.</Text></View>}
    <Text style={styles.text}>{q.prompt}</Text>
    {!q.answered&&q.options.map((option,index) => <Pressable key={index} accessibilityRole="button"
      accessibilityState={{ disabled: disabled || q.answered }} disabled={disabled || q.answered}
      onPress={() => onAnswer(q.id,index)} style={[styles.option, q.answered && q.correct_index === index && styles.correct,
        q.answered && q.selected_index === index && q.correct === false && styles.wrong]}>
      <Text style={styles.text}>{String.fromCharCode(65+index)}. {option}{q.answered && q.correct_index===index ? ' ✓' : ''}</Text>
    </Pressable>)}
    {q.answered ? <><Text accessibilityLiveRegion="polite" style={styles.title}>{q.correct ? '¡CORRECTO! Próximo ataque +15.' : 'INCORRECTO · Se añadió +10 al contraataque.'}</Text>
      {q.correct===false&&q.correct_index!==null&&<Text style={styles.text}>Respuesta correcta: {q.options[q.correct_index]}</Text>}
      <Text style={styles.text}>{q.explanation}</Text><Pressable accessibilityRole="button" onPress={onContinue} style={styles.continue}><Text style={styles.title}>CONTINUAR COMBATE →</Text></Pressable></> : <Text style={styles.muted}>Responde para resolver el contraataque. Solo puedes contestar una vez.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: '#E9B949', padding: 16, backgroundColor: '#101321', gap: 12 },
  title: { color: '#E9B949', fontWeight: 'bold', lineHeight: 23 }, text: { color: '#f0ebff', lineHeight: 24 },
  muted: { color: '#bcb6cf', fontSize: 12, lineHeight: 20 }, option: { borderWidth: 1, borderColor: '#77718b', padding: 14, minHeight: 48 },
  correct: { borderColor: '#43BFA0', backgroundColor: '#22443f' }, wrong: { borderColor: '#D75B65', backgroundColor: '#49242c' },
  stakes:{gap:6,padding:12,backgroundColor:'#191c30'},reward:{color:'#43BFA0',fontSize:12,lineHeight:20},risk:{color:'#eda0a8',fontSize:12,lineHeight:20},continue:{backgroundColor:'#33274c',padding:15,borderWidth:1,borderColor:'#7855C8'},
});
