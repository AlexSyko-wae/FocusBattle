import {useCallback,useState} from 'react';
import {router,useFocusEffect} from 'expo-router';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAccount} from '@/hooks/account-context';
import {supabase} from '@/services/supabase';
import {PixelSprite} from '@/components/battle-art';
import {BottomNavigation} from '@/components/bottom-navigation';
import {enemyArt,campaignSize} from '@/constants/enemies';
type CampState={active:{enemy_id:number;player_hp:number;turn:number}|null;interests:number|null;mode:string;medals:number|null;error:boolean};
export function CampHome(){
 const account=useAccount();const{width,height}=useWindowDimensions();const wide=width>height&&width>=650;
 const [state,setState]=useState<CampState|null>(null);const[revision,setRevision]=useState(0);const userId=account.session?.user.id;
 useFocusEffect(useCallback(()=>{
  if(!userId||!supabase)return;
  const client=supabase;let live=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  void(async()=>{try{
   const[active,interests,profile,medals]=await Promise.all([
    client.from('battles').select('enemy_id,player_hp,turn').eq('user_id',userId).eq('status','active').limit(1).abortSignal(controller.signal).maybeSingle(),
    client.from('user_interests').select('category_id',{count:'exact',head:true}).eq('user_id',userId).abortSignal(controller.signal),
    client.from('profiles').select('question_mode').eq('id',userId).abortSignal(controller.signal).single(),
    client.rpc('get_campaign_medals').abortSignal(controller.signal),
   ]);
   if(live)setState({active:active.error?null:active.data,interests:interests.error?null:interests.count,mode:profile.data?.question_mode??'',medals:medals.error?null:(medals.data as {unlocked:boolean}[]).filter(item=>item.unlocked).length,error:!!(active.error||interests.error||profile.error||medals.error)});
  }catch{if(live)setState(previous=>previous?{...previous,error:true}:{active:null,interests:null,mode:'',medals:null,error:true});}finally{clearTimeout(timer);}})();
  return()=>{live=false;controller.abort();clearTimeout(timer);};
 // revision recreates the focus subscription when the player explicitly retries.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[userId,revision]));
 const p=account.player;const xp=p?.total_xp??0;const level=p?Math.floor(xp/100)+1:null;
 const modeNames:Record<string,string>={adaptive:'Adaptativo',easy:'Fácil',normal:'Normal',hard:'Difícil'};
 const scene=<View style={styles.scene}>
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
   <View style={styles.moon}/>{[9,24,43,66,86].map((x,i)=><View key={x} style={[styles.star,{left:`${x}%`,top:25+i%3*18}]}/>)}
   <View style={[styles.mountain,{left:-35,bottom:50}]}/><View style={[styles.mountain,{right:-50,bottom:42,backgroundColor:'#35405d',transform:[{rotate:'35deg'}]}]}/>
   <View style={styles.forest}/><View style={styles.ground}/><View style={styles.path}/>
  </View>
  <View style={styles.sceneTop}><Text style={styles.sceneLabel}>SANTUARIO DEL ENFOQUE</Text><View style={styles.safeTag}><Text style={styles.safeText}>ZONA SEGURA</Text></View></View>
  <View style={styles.campProps}><View style={styles.flagPole}/><View style={styles.flag}/><View style={styles.heroShadow}/><PixelSprite kind="hero" pixel={8}/><View style={styles.fire}><View style={styles.flameOuter}/><View style={styles.flameInner}/><View style={styles.log}/></View></View>
  <View style={styles.sceneBottom}><Text style={styles.heroName}>{p?.display_name??'Aventurero'}</Text><Text style={styles.heroSubtitle}>Cada respuesta te hace más fuerte.</Text></View>
  <View style={styles.scenePlaces}>
   <Pressable accessibilityRole="button" accessibilityLabel="Entrar a la arena desde el campamento" onPress={()=>router.push(state?.active?'/battle':state?.interests===0?'/prepare':'/arena')} style={styles.place}><Text style={styles.placeIcon}>⚑</Text><Text style={styles.placeLabel}>ARENA</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Preparar intereses en la fogata" onPress={()=>router.push('/prepare')} style={styles.place}><Text style={styles.placeIcon}>♨</Text><Text style={styles.placeLabel}>FOGATA</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Abrir el cofre de medallas" onPress={()=>router.push('/medals')} style={styles.place}><Text style={styles.placeIcon}>▣</Text><Text style={styles.placeLabel}>COFRE</Text></Pressable>
  </View>
 </View>;
 const controls=<View style={styles.command}>
  <View style={styles.sectionHeading}><Text style={styles.kicker}>TU PRÓXIMO PASO</Text><Text style={styles.chapter}>CAPÍTULO {Math.min(p?.unlocked_enemy??1,campaignSize)} / {campaignSize}</Text></View>
  <Pressable accessibilityRole="button" onPress={()=>router.push(state?.active?'/battle':state?.interests===0?'/prepare':'/arena')} style={({pressed})=>[styles.play,pressed&&styles.pressed]}>
   <View style={styles.playRune}><Text style={styles.playRuneText}>⚔</Text></View><View style={{flex:1,gap:5}}><Text style={styles.playTitle}>{state?.active?'CONTINUAR AVENTURA':'ENTRAR EN COMBATE'}</Text><Text style={styles.playDetail}>{state?.active?`${enemyArt(state.active.enemy_id).shortName} · ${state.active.player_hp} HP · partida guardada`:'Elige un rival. Lee sus intenciones. Supera el desafío.'}</Text></View><Text style={styles.chevron}>›</Text>
  </Pressable>
  <View style={styles.shortcuts}>
   <Shortcut icon="✦" title="Intereses" subtitle={state?.interests===null||!state?'Personaliza tu aventura':`${state.interests} categorías`} onPress={()=>router.push('/prepare')}/>
   <Shortcut icon="❖" title="Medallas" subtitle={state?.medals===null||!state?'Tus conquistas':`${state.medals} de 6 conseguidas`} onPress={()=>router.push('/medals')}/>
   <Shortcut icon="◇" title="Perfil" subtitle="Tu historia" onPress={()=>router.push('/profile')}/>
  </View>
  <View style={styles.journal}><View style={styles.journalMark}><Text style={styles.journalGlyph}>≡</Text></View><View style={{flex:1,gap:6}}><Text style={styles.journalTitle}>{state?.active?'Tu aventura sigue en pie':'Prepara tu siguiente victoria'}</Text><Text style={styles.journalCopy}>{state?.active?'Tu rival te espera. Continúa sin perder tu progreso.':`${modeNames[state?.mode??'']??'Elige tu dificultad'} · Defender a tiempo también es una forma de atacar.`}</Text></View></View>
  {(state?.error||account.message)&&<Pressable accessibilityRole="button" onPress={()=>{setRevision(value=>value+1);account.refresh();}} style={styles.retry}><Text style={styles.retryText}>No pudimos actualizar todos los datos. Toca para reintentar.</Text></Pressable>}
 </View>;
 return <SafeAreaView style={styles.screen}>
  <View style={styles.header}><View><Text style={styles.wordmark}>FOCUS<Text style={{color:'#c3a7ff'}}>BATTLE</Text></Text><Text style={styles.headerLabel}>CAMPAMENTO</Text></View><View style={styles.levelPill}><Text style={styles.levelText}>NV. {level??'—'}</Text></View></View>
  <ScrollView contentContainerStyle={styles.content}>
   <View style={styles.progress}><View style={styles.xpHeading}><Text style={styles.progressLabel}>{p?`${xp} XP · ${p.wins} victorias`:'Recuperando tu progreso…'}</Text><Text style={styles.nextLevel}>{level===null?'':`${100-xp%100} XP para nivel ${level+1}`}</Text></View><View style={styles.xpTrack}><View style={[styles.xpFill,{width:`${xp%100}%`}]}/></View></View>
   <View style={[styles.layout,wide&&styles.wide]}><View style={wide?styles.left:undefined}>{scene}</View><View style={wide?styles.right:undefined}>{controls}</View></View>
  </ScrollView><BottomNavigation/>
 </SafeAreaView>;
}
function Shortcut({icon,title,subtitle,onPress}:{icon:string;title:string;subtitle:string;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[styles.shortcut,pressed&&styles.pressed]}><Text style={styles.shortcutIcon}>{icon}</Text><Text style={styles.shortcutTitle}>{title}</Text><Text style={styles.shortcutDetail}>{subtitle}</Text></Pressable>;}
const styles=StyleSheet.create({
 scenePlaces:{flexDirection:'row',gap:8,padding:12,backgroundColor:'#101927a8'},place:{flex:1,minHeight:58,alignItems:'center',justifyContent:'center',gap:4,borderWidth:1,borderColor:'#69718c',borderRadius:10,backgroundColor:'#28334b'},placeIcon:{color:'#E9B949',fontSize:24},placeLabel:{color:'#f2e6c7',fontSize:10,fontWeight:'bold',letterSpacing:1},
 screen:{flex:1,backgroundColor:'#101321'},header:{paddingHorizontal:22,paddingTop:14,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},wordmark:{color:'#E9B949',fontWeight:'900',fontSize:21,letterSpacing:1},headerLabel:{color:'#979bb7',fontSize:9,letterSpacing:3,marginTop:4},levelPill:{borderRadius:10,backgroundColor:'#302742',borderWidth:1,borderColor:'#705692',paddingHorizontal:13,paddingVertical:9},levelText:{color:'#E9B949',fontWeight:'bold',fontSize:12},content:{paddingHorizontal:18,paddingBottom:20,gap:18,maxWidth:1100,width:'100%',alignSelf:'center'},progress:{gap:8,paddingHorizontal:4},xpHeading:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:5},progressLabel:{color:'#d0cce0',fontSize:11},nextLevel:{color:'#9297b0',fontSize:10},xpTrack:{height:5,backgroundColor:'#292d43',borderRadius:4,overflow:'hidden'},xpFill:{height:5,backgroundColor:'#E9B949'},layout:{gap:20},wide:{flexDirection:'row',alignItems:'stretch'},left:{flex:1},right:{flex:1.1},
 scene:{minHeight:280,backgroundColor:'#1a2440',borderRadius:18,borderWidth:1,borderColor:'#3f4867',overflow:'hidden',justifyContent:'space-between'},sceneTop:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:7,padding:16},sceneLabel:{color:'#c9cedd',fontSize:8,letterSpacing:1.5},safeTag:{backgroundColor:'#1b3d3c',borderRadius:5,paddingHorizontal:7,paddingVertical:4},safeText:{color:'#7ed0b0',fontSize:7,letterSpacing:1},moon:{position:'absolute',width:30,height:30,backgroundColor:'#e6cf93',borderRadius:4,right:'18%',top:48,opacity:.8},star:{position:'absolute',width:3,height:3,backgroundColor:'#a7b0cf'},mountain:{position:'absolute',width:190,height:140,backgroundColor:'#2d3553',transform:[{rotate:'-32deg'}]},forest:{position:'absolute',bottom:40,left:0,right:0,height:36,backgroundColor:'#1b3439'},ground:{position:'absolute',bottom:0,left:0,right:0,height:82,backgroundColor:'#1b292f',borderTopWidth:5,borderColor:'#476252'},path:{position:'absolute',bottom:-18,left:'26%',width:130,height:85,backgroundColor:'#3e3b39',transform:[{rotate:'-12deg'}]},campProps:{height:140,alignItems:'center',justifyContent:'flex-end',paddingRight:30},heroShadow:{position:'absolute',bottom:0,width:90,height:12,borderRadius:45,backgroundColor:'#0c1523',left:'33%'},flagPole:{position:'absolute',left:'16%',bottom:0,width:5,height:98,backgroundColor:'#9b8b6b'},flag:{position:'absolute',left:'16%',bottom:58,width:35,height:37,backgroundColor:'#7855C8',borderRightWidth:8,borderBottomWidth:8,borderColor:'#a58bdc'},fire:{position:'absolute',bottom:2,right:'19%',width:38,height:48,alignItems:'center',justifyContent:'flex-end'},flameOuter:{width:25,height:35,backgroundColor:'#db8448',borderTopLeftRadius:13,borderTopRightRadius:3,transform:[{rotate:'-8deg'}]},flameInner:{position:'absolute',bottom:6,width:12,height:23,backgroundColor:'#f5ca68',borderTopLeftRadius:8},log:{width:36,height:6,backgroundColor:'#6d5145',borderRadius:3},sceneBottom:{padding:17,gap:4,backgroundColor:'#101927a8'},heroName:{color:'#f0e8d6',fontWeight:'bold',fontSize:19},heroSubtitle:{color:'#a9b9c3',fontSize:10},
 command:{gap:14},sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6},kicker:{color:'#c6c2da',fontSize:9,fontWeight:'bold',letterSpacing:1.5},chapter:{color:'#858aa4',fontSize:9},play:{flexDirection:'row',alignItems:'center',gap:13,backgroundColor:'#E9B949',borderRadius:14,borderBottomWidth:4,borderColor:'#a9752e',padding:17,minHeight:91},playRune:{width:38,height:38,borderRadius:10,backgroundColor:'#d9a83e',alignItems:'center',justifyContent:'center'},playRuneText:{color:'#332b26',fontSize:25},playTitle:{color:'#292332',fontWeight:'900',fontSize:14,letterSpacing:.5},playDetail:{color:'#5f4a32',fontSize:10,lineHeight:16},chevron:{fontSize:32,color:'#58452f'},shortcuts:{flexDirection:'row',gap:10},shortcut:{flex:1,backgroundColor:'#1b2035',borderWidth:1,borderColor:'#343b57',borderRadius:13,paddingVertical:14,paddingHorizontal:8,alignItems:'center',gap:7,minHeight:103},shortcutIcon:{color:'#bca1ed',fontSize:23},shortcutTitle:{color:'#e3deed',fontSize:11,fontWeight:'bold'},shortcutDetail:{color:'#8f96b1',fontSize:8,textAlign:'center',lineHeight:13},journal:{flexDirection:'row',alignItems:'center',gap:13,borderWidth:1,borderColor:'#303750',backgroundColor:'#151b2c',padding:15,borderRadius:12},journalMark:{width:35,height:41,backgroundColor:'#292b3f',alignItems:'center',justifyContent:'center',borderRadius:7},journalGlyph:{color:'#9a8eb8',fontSize:24},journalTitle:{color:'#d7d2e4',fontSize:12,fontWeight:'bold'},journalCopy:{color:'#969db5',fontSize:10,lineHeight:17},pressed:{opacity:.8,transform:[{translateY:1}]},retry:{padding:10},retryText:{color:'#d9b770',fontSize:11,lineHeight:18},
});
