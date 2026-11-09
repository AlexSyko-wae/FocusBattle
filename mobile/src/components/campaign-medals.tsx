import {useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {supabase} from '@/services/supabase';
type Medal={id:string;name:string;description:string;progress:number;target:number;unlocked:boolean};
export function CampaignMedals(){
 const [revision,setRevision]=useState(0);
 const [resource,setResource]=useState<{revision:number;medals:Medal[]|null}|null>(null);
 useEffect(()=>{
  let live=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  void(async()=>{try{const{data,error}=await supabase!.rpc('get_campaign_medals').abortSignal(controller.signal);if(error)throw error;if(live)setResource({revision,medals:data as Medal[]});}catch{if(live)setResource({revision,medals:null});}finally{clearTimeout(timer);}})();
  return()=>{live=false;controller.abort();clearTimeout(timer);};
 },[revision]);
 const current=resource?.revision===revision?resource:null;
 return <View style={styles.panel}><Text style={styles.title}>MEDALLAS DE CAMPAÑA</Text>
  {!current?<ActivityIndicator color="#E9B949"/>:!current.medals?<><Text style={styles.text}>No pudimos recuperar tus medallas.</Text><Pressable accessibilityRole="button" onPress={()=>setRevision(value=>value+1)}><Text style={styles.title}>REINTENTAR</Text></Pressable></>:current.medals.map(medal=><View key={medal.id} style={[styles.medal,medal.unlocked&&styles.unlocked]}>
   <Text style={[styles.icon,medal.unlocked?styles.gold:styles.muted]}>{medal.unlocked?'✦':'◇'}</Text><View style={{flex:1,gap:6}}><Text style={styles.name}>{medal.name}</Text><Text style={styles.text}>{medal.description}</Text><Text style={medal.unlocked?styles.gold:styles.muted}>{medal.unlocked?'CONSEGUIDA':`${medal.progress}/${medal.target}`}</Text></View>
  </View>)}<Text style={styles.muted}>Las medallas celebran tu progreso; no restan XP ni bloquean la aventura.</Text>
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:'#191c30',borderWidth:1,borderColor:'#7855C8',padding:16,gap:14},title:{color:'#E9B949',fontWeight:'bold',letterSpacing:1,fontSize:12},medal:{flexDirection:'row',gap:15,backgroundColor:'#101321',borderWidth:1,borderColor:'#414864',padding:15},unlocked:{borderColor:'#E9B949'},icon:{fontSize:28},gold:{color:'#E9B949',fontSize:11},muted:{color:'#aaa4bf',fontSize:11,lineHeight:19},name:{color:'#f0ebff',fontWeight:'bold',fontSize:15},text:{color:'#cec8df',fontSize:12,lineHeight:20}});
