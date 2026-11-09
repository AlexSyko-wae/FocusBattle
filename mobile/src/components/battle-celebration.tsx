import {useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {supabase} from '@/services/supabase';
import {enemyArt} from '@/constants/enemies';

type Progress={total_xp:number;unlocked_enemy:number};
type Medal={id:string;name:string;unlocked:boolean};
export function BattleCelebration({battleId,status,userId}:{battleId:string;status:string;userId:string}){
 const baseline=useRef<{battleId:string;progress:Progress;medals:Medal[]}|null>(null);
 const [celebration,setCelebration]=useState<{battleId:string;messages:string[]}|null>(null);
 useEffect(()=>{
  let live=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  void(async()=>{try{
   const [p,m]=await Promise.all([
    supabase!.from('player_progress').select('total_xp,unlocked_enemy').eq('user_id',userId).abortSignal(controller.signal).single(),
    supabase!.rpc('get_campaign_medals').abortSignal(controller.signal),
   ]);
   if(!live||p.error||m.error)return;
   const progress=p.data as Progress;const medals=m.data as Medal[];
   if(status==='active'){baseline.current={battleId,progress,medals};return;}
   const before=baseline.current;if(status!=='won'||before?.battleId!==battleId)return;
   const messages:string[]=[];
   const level=Math.floor(progress.total_xp/100)+1;
   if(level>Math.floor(before.progress.total_xp/100)+1)messages.push(`¡SUBISTE AL NIVEL ${level}!`);
   if(progress.unlocked_enemy>before.progress.unlocked_enemy)messages.push(`NUEVO RIVAL: ${enemyArt(progress.unlocked_enemy).shortName.toLocaleUpperCase('es')}`);
   for(const medal of medals)if(medal.unlocked&&before.medals.some(old=>old.id===medal.id&&!old.unlocked))messages.push(`MEDALLA CONSEGUIDA · ${medal.name}`);
   setCelebration({battleId,messages});
  }catch{/* Los logros no bloquean el resultado del combate. */}finally{clearTimeout(timer);}})();
  return()=>{live=false;controller.abort();clearTimeout(timer);};
 },[battleId,status,userId]);
 if(status!=='won'||celebration?.battleId!==battleId||!celebration.messages.length)return null;
 return <View accessibilityLiveRegion="polite" style={styles.banner}><Text style={styles.stars}>✦ ★ ✦</Text>{celebration.messages.map(message=><Text key={message} style={styles.message}>{message}</Text>)}</View>;
}
const styles=StyleSheet.create({banner:{backgroundColor:'#352b47',borderWidth:2,borderColor:'#E9B949',borderRadius:16,padding:18,gap:12,alignItems:'center'},stars:{color:'#E9B949',fontSize:30,letterSpacing:14},message:{color:'#fff0bf',fontWeight:'900',fontSize:15,textAlign:'center'}});
