import { useEffect,useState } from 'react';
import { Text,View,StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import {enemyArt} from '@/constants/enemies';
type RecordRow={enemy_id:number;best_hp:number;best_accuracy:number|null;fewest_errors:number;fewest_actions:number;wins:number};
export function BattleRecords({enemyId}:{enemyId?:number}) {
 const [records,setRecords]=useState<RecordRow[]|null>(null);
 useEffect(()=>{
  let live=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  void (async()=>{try{const {data,error}=await supabase!.rpc('get_battle_records').abortSignal(controller.signal);if(live&&!error)setRecords(data as RecordRow[]);}catch{/* Las marcas no bloquean el combate. */}finally{clearTimeout(timer);}})();
  return()=>{live=false;controller.abort();clearTimeout(timer);};
 },[]);
 const shown=records?.filter(row=>!enemyId||row.enemy_id===enemyId);
 return <View style={styles.card}><Text style={styles.title}>TUS MARCAS</Text>
  {!shown?.length?<Text style={styles.muted}>Gana una batalla para registrar tu marca. Repite para conservar más HP, cometer menos errores o terminar en menos acciones.</Text>:shown.map(row=><View key={row.enemy_id} style={styles.row}>
   <Text style={styles.text}>{enemyArt(row.enemy_id).shortName} · {row.wins} victorias</Text>
   <Text style={styles.muted}>Mejor salud: {row.best_hp} HP · Menos errores: {row.fewest_errors}</Text>
   <Text style={styles.muted}>Menos acciones: {row.fewest_actions} · Mejor precisión: {row.best_accuracy===null?'—':`${row.best_accuracy} %`}</Text>
  </View>)}
 </View>;
}
const styles=StyleSheet.create({card:{padding:15,backgroundColor:'#101321',borderWidth:1,borderColor:'#414864',gap:10},title:{color:'#E9B949',fontWeight:'bold',fontSize:12,letterSpacing:1},text:{color:'#e9e5f5',fontWeight:'bold',fontSize:12,lineHeight:20},muted:{color:'#bcb6cf',fontSize:11,lineHeight:19},row:{gap:4}});
