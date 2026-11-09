import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { pixelPalette, sprites, type SpriteKind } from '@/constants/pixel-art';
import {enemyArt,campaignSize} from '@/constants/enemies';

export const PixelSprite = memo(function PixelSprite({ kind, pixel=5 }: {kind:SpriteKind;pixel?:number}) {
  return <View accessible={false} style={{width:16*pixel,height:16*pixel}}>{sprites[kind].map((row,y)=>{
    const runs: {color:string;start:number;length:number}[]=[];
    for(let x=0;x<row.length;x++) {
      if(row[x]==='.')continue;
      const last=runs[runs.length-1];
      if(last && last.color===row[x] && last.start+last.length===x)last.length++;
      else runs.push({color:row[x],start:x,length:1});
    }
    return <View key={y} style={{height:pixel}}>{runs.map(run=><View key={run.start} style={{position:'absolute',left:run.start*pixel,width:run.length*pixel,height:pixel,backgroundColor:pixelPalette[run.color]}}/>)}</View>;
  })}</View>;
});
export function BattleStage({enemyId,playerHp,enemyHp,status,playerDamage=0,enemyDamage=0,healing=0,action,sequence=0,heavy=false,intent}:{enemyId:number;playerHp:number;enemyHp:number;status:string;playerDamage?:number;enemyDamage?:number;healing?:number;action?:string|null;sequence?:number;heavy?:boolean;intent?:string}) {
  const [reduceMotion,setReduceMotion]=useState(true);
  const [heroShift]=useState(()=>new Animated.Value(0));
  const [enemyShift]=useState(()=>new Animated.Value(0));
  const [effect]=useState(()=>new Animated.Value(0));
  const [heroScale]=useState(()=>new Animated.Value(1));
  const previous=useRef({playerHp,enemyHp});
  useEffect(()=>{
    let live=true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live)setReduceMotion(value);}).catch(()=>{});
    const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
    return()=>{live=false;listener.remove();};
  },[]);
  useEffect(()=>{
    heroShift.setValue(0);enemyShift.setValue(0);
    function shake(value:Animated.Value) {
      value.stopAnimation();
      Animated.sequence([Animated.timing(value,{toValue:-4,duration:55,useNativeDriver:true}),Animated.timing(value,{toValue:4,duration:55,useNativeDriver:true}),Animated.timing(value,{toValue:0,duration:70,useNativeDriver:true})]).start();
    }
    if(!reduceMotion) {
      if(playerHp<previous.current.playerHp)shake(heroShift);
      if(enemyHp<previous.current.enemyHp)shake(enemyShift);
    }
    previous.current={playerHp,enemyHp};
    return()=>{heroShift.stopAnimation();enemyShift.stopAnimation();};
  },[playerHp,enemyHp,heroShift,enemyShift,reduceMotion]);
  useEffect(()=>{
    if(!sequence)return;
    effect.setValue(1);
    const fade=Animated.timing(effect,{toValue:0,duration:reduceMotion?250:900,useNativeDriver:true});
    if(!reduceMotion&&action){
      const value=action==='attack'?heroShift:heroScale;
      const target=action==='attack'?22:action==='special'?1.2:action==='defend'?.9:1.08;
      Animated.sequence([Animated.timing(value,{toValue:target,duration:130,useNativeDriver:true}),Animated.timing(value,{toValue:action==='attack'?0:1,duration:220,useNativeDriver:true})]).start();
    }
    fade.start();return()=>{fade.stop();heroScale.stopAnimation();heroScale.setValue(1);};
  },[sequence,action,reduceMotion,effect,heroScale,heroShift]);
  const art=enemyArt(enemyId);const kind=art.sprite;
  const dialogue=status==='won'?art.win:status==='lost'?art.loss:heavy?art.heavy:intent==='evade'?'¿Puedes alcanzar una ilusión?':intent==='recover'?'Un descanso… ¡y vuelvo a la carga!':intent==='vulnerable'?'Mi armadura necesita recargarse…':art.quote;
  return <View style={[styles.stage,{backgroundColor:art.background}]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[12,34,61,82].map((left,index)=><View key={left} style={[styles.star,{left:`${left}%`,top:30+index%2*24}]}/>)}
      <View style={styles.moon}/><View style={[styles.pillar,{left:12}]}/><View style={[styles.pillar,{right:12,height:85,top:55}]}/>
      <View style={styles.horizon}/><View style={styles.ground}/>
      {[0,1,2,3,4,5,6].map(i=><View key={i} style={[styles.tile,{left:`${i*16}%`}]}/>)}
    </View>
    <Text style={styles.location}>{art.location}</Text>
    <Text style={styles.dialogue}>«{dialogue}»</Text>
    <Animated.View pointerEvents="none" style={[styles.actionEffect,{opacity:effect,backgroundColor:action==='heal'?'#43BFA033':action==='defend'?'#65cff033':action==='special'?'#ad78ff55':'#e9b94922'}]}><Text style={styles.effectText}>{action==='special'?'✦ DESCARGA DE ENFOQUE ✦':action==='defend'?'◇ ESCUDO ACTIVO':action==='heal'?'✚ RECUPERACIÓN':action==='attack'?'⚔ ATAQUE':''}</Text></Animated.View>
    <View style={styles.fighters}>
      <View style={styles.fighter}><View style={styles.shadow}/><Animated.View style={{transform:[{translateX:heroShift},{scale:heroScale}],opacity:status==='lost'?0.4:1}}><PixelSprite kind="hero"/></Animated.View><Text style={styles.label}>AVENTURERO</Text><Text style={{color:healing?'#43BFA0':'#ff96a0',fontSize:12,fontWeight:'bold',minHeight:18}}>{healing?`+${healing} HP `:''}{enemyDamage?`−${enemyDamage}`:''}</Text></View>
      <Text style={styles.vs}>✦</Text>
      <View style={styles.fighter}><View style={styles.shadow}/><Animated.View style={{transform:[{translateX:enemyShift}],opacity:status==='won'?0.3:1}}><PixelSprite kind={kind}/></Animated.View><Text style={styles.label}>RIVAL {String(enemyId).padStart(2,'0')}</Text><Text style={{color:'#E9B949',fontSize:12,fontWeight:'bold',minHeight:18}}>{playerDamage?`−${playerDamage} HP`:''}</Text></View>
    </View>
  </View>;
}
export function BattleResult({won,xp,correct,wrong,campaign}:{won:boolean;xp:number;correct:number;wrong:number;campaign:boolean}) {
  return <View style={[styles.result,{borderColor:won?'#E9B949':'#D75B65'}]}>
    <Text style={[styles.emblem,{color:won?'#E9B949':'#D75B65'}]}>{won?'✦':'◇'}</Text>
    <Text accessibilityRole="header" style={[styles.resultTitle,{color:won?'#E9B949':'#D75B65'}]}>{won?'¡VICTORIA!':'DERROTA'}</Text>
    <Text style={styles.resultCopy}>{won?'La voluntad supera a la distracción.':'Descansa, aprende y vuelve a intentarlo.'}</Text>
    <Text style={styles.xp}>+{xp} XP</Text>
    {won&&xp===0&&<Text style={styles.resultCopy}>Recompensa inicial ya obtenida · partida anterior</Text>}
    {won&&xp===10&&<Text style={styles.resultCopy}>Revancha ganada · sigue creciendo tu experiencia</Text>}
    <View style={styles.score}><Text style={styles.scoreText}>{correct} ACIERTOS</Text><Text style={styles.scoreText}>{wrong} ERRORES</Text></View>
    {campaign&&<Text style={styles.campaign}>LOS {campaignSize} RIVALES SUPERADOS</Text>}
  </View>;
}
const styles=StyleSheet.create({
  dialogue:{color:'#e2d8f4',textAlign:'center',fontSize:12,lineHeight:18,paddingHorizontal:18,paddingTop:10,minHeight:46},actionEffect:{position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:2,alignItems:'center',justifyContent:'center'},effectText:{color:'#fff0c7',fontWeight:'900',fontSize:16,textAlign:'center',backgroundColor:'#171c38dd',padding:12,borderRadius:12},
  stage:{minHeight:210,overflow:'hidden',borderWidth:2,borderColor:'#414864'},location:{color:'#bbb8cf',fontSize:9,letterSpacing:1.5,textAlign:'center',paddingTop:16},
  star:{position:'absolute',width:3,height:3,backgroundColor:'#aaa8c5'},moon:{position:'absolute',width:24,height:24,backgroundColor:'#ded5a4',top:38,right:'26%',opacity:0.6},
  pillar:{position:'absolute',top:70,width:25,height:70,backgroundColor:'#3e4657',opacity:0.5,borderTopWidth:7,borderColor:'#697288'},horizon:{position:'absolute',bottom:64,left:0,right:0,height:28,backgroundColor:'#293949'},
  ground:{position:'absolute',bottom:0,left:0,right:0,height:64,backgroundColor:'#242a39',borderTopWidth:5,borderColor:'#63705f'},tile:{position:'absolute',bottom:10,width:25,height:3,backgroundColor:'#414864'},
  fighters:{flexDirection:'row',justifyContent:'space-around',alignItems:'center',paddingTop:34,paddingBottom:22},fighter:{alignItems:'center'},shadow:{position:'absolute',width:70,height:10,bottom:22,borderRadius:35,backgroundColor:'#0c1020',opacity:0.6},
  label:{color:'#cfcedc',fontSize:9,letterSpacing:1,marginTop:10},vs:{color:'#E9B949',fontSize:18},result:{backgroundColor:'#101321',borderWidth:2,padding:20,alignItems:'center',gap:12},emblem:{fontSize:40},
  resultTitle:{fontSize:28,fontWeight:'900',letterSpacing:2},resultCopy:{color:'#bcb6cf',fontSize:12,lineHeight:20,textAlign:'center'},xp:{color:'#43BFA0',fontSize:30,fontWeight:'bold'},score:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:18},scoreText:{color:'#e9e5f5',fontSize:11},campaign:{color:'#E9B949',fontWeight:'bold',fontSize:12,textAlign:'center',lineHeight:20},
});
