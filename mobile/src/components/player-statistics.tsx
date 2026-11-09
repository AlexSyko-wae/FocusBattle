import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/services/supabase';
type Category = { id: number; name: string; difficulty: number; correct: number; wrong: number; answered: number; accuracy: number | null; correct_streak: number; wrong_streak: number };
type Stats = { display_name: string; total_xp: number; level: number; xp_in_level: number; xp_to_next_level: number; wins: number; losses: number; unlocked_enemies: number; correct: number; wrong: number; answered: number; accuracy: number | null; categories: Category[]; enemies: { id: number; name: string; unlocked: boolean; defeated: boolean }[] };
const percent = (value: number | null) => value===null ? '—' : `${value.toLocaleString('es-MX',{maximumFractionDigits:1})} %`;
export function PlayerStatistics() {
  const [revision,setRevision] = useState(0);
  const [resource,setResource] = useState<{ revision: number; data: Stats | null } | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const client=supabase;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    let live=true;
    void (async()=>{
      try {
        const { data,error }=await client.rpc('get_player_stats').abortSignal(controller.signal);
        if(error || !data) throw error ?? new Error('Perfil no disponible');
        if(live) setResource({revision,data:data as Stats});
      } catch {if(live) setResource({revision,data:null});}
      finally {clearTimeout(timer);}
    })();
    return ()=>{live=false;controller.abort();clearTimeout(timer);};
  },[revision]);
  const current=resource?.revision===revision ? resource : null;
  const stats=current?.data;
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>TU HISTORIA</Text>
    {!current ? <ActivityIndicator accessibilityLabel="Cargando estadísticas" color="#43BFA0" /> : !stats ?
      <Text accessibilityLiveRegion="polite" style={styles.text}>No pudimos cargar tu progreso. Revisa tu conexión y vuelve a intentarlo.</Text> : <>
      <Text style={styles.name}>{stats.display_name} · Nivel {stats.level}</Text>
      <Text style={styles.text}>{stats.total_xp} XP acumulada</Text>
      <View style={styles.track} accessible accessibilityLabel={`${stats.xp_in_level} de 100 XP del nivel actual`}><View style={[styles.fill,{width:`${stats.xp_in_level}%`}]} /></View>
      <Text style={styles.muted}>{stats.xp_to_next_level} XP para el siguiente nivel</Text>
      <View style={styles.grid}><Metric label="Victorias" value={stats.wins}/><Metric label="Derrotas" value={stats.losses}/><Metric label="Respondidas" value={stats.answered}/><Metric label="Aciertos" value={stats.correct}/><Metric label="Errores" value={stats.wrong}/><Metric label="Precisión" value={percent(stats.accuracy)}/></View>
      {stats.answered===0 && <Text style={styles.muted}>Tu aprendizaje empieza con el próximo desafío.</Text>}
      <Text style={styles.title}>CAMPAÑA · {stats.unlocked_enemies}/{stats.enemies.length}</Text>
      {stats.enemies.map(enemy=><View key={enemy.id} style={styles.row}><Text style={styles.text}>{enemy.name}</Text><Text style={enemy.defeated?styles.success:styles.muted}>{enemy.defeated?'DERROTADO':enemy.unlocked?'DISPONIBLE':'BLOQUEADO'}</Text></View>)}
      {stats.enemies.length>0 && stats.enemies.every(enemy=>enemy.defeated) && <Text style={styles.success}>¡Campaña completada!</Text>}
      <Text style={styles.title}>APRENDIZAJE POR CATEGORÍA</Text>
      {stats.categories.map(category=><View key={category.id} style={styles.category}>
        <View style={styles.row}><Text style={styles.categoryName}>{category.name}</Text><Text style={styles.success}>{percent(category.accuracy)}</Text></View>
        <Text style={styles.muted}>{category.answered ? `${category.answered} respondidas · ${category.correct} aciertos · ${category.wrong} errores`:'Sin respuestas todavía'}</Text>
        <View style={styles.track}><View style={[styles.fill,{width:`${category.accuracy??0}%`}]} /></View>
        <Text style={styles.text}>Nivel adaptativo: {['','Fácil','Medio','Difícil'][category.difficulty]}</Text>
        {category.correct_streak>0 && <Text style={styles.muted}>Racha: {category.correct_streak} {category.correct_streak===1?'acierto':'aciertos'}</Text>}
        {category.wrong_streak>0 && <Text style={styles.muted}>Racha: {category.wrong_streak} {category.wrong_streak===1?'error':'errores'}</Text>}
      </View>)}
    </>}
    <Pressable accessibilityRole="button" disabled={!current} style={[styles.button,!current&&styles.disabled]} onPress={()=>setRevision(value=>value+1)}><Text style={styles.buttonText}>{current?'ACTUALIZAR ESTADÍSTICAS':'CARGANDO…'}</Text></Pressable>
  </View>;
}
function Metric({label,value}:{label:string;value:number|string}) {return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;}
const styles=StyleSheet.create({
  panel:{backgroundColor:'#191c30',borderWidth:2,borderColor:'#7855C8',padding:18,gap:16},title:{color:'#E9B949',fontWeight:'bold',letterSpacing:1,lineHeight:23},name:{color:'#f0ebff',fontSize:22,fontWeight:'bold'},text:{color:'#e9e5f5',lineHeight:23},muted:{color:'#bcb6cf',fontSize:12,lineHeight:20},success:{color:'#43BFA0',fontSize:12,lineHeight:21},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{flexGrow:1,flexBasis:'44%',backgroundColor:'#101321',padding:15,gap:6},metricValue:{color:'#E9B949',fontSize:25,fontWeight:'bold'},track:{backgroundColor:'#34384e',height:8},fill:{backgroundColor:'#43BFA0',height:8},row:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:6},category:{borderTopWidth:1,borderTopColor:'#414864',paddingTop:16,gap:9},categoryName:{color:'#f0ebff',fontWeight:'bold',fontSize:16},button:{backgroundColor:'#7855C8',padding:16},buttonText:{color:'#fff',fontWeight:'bold',textAlign:'center'},disabled:{opacity:0.5},
});
