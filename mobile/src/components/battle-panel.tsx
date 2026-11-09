import { useEffect, useRef, useState, type ComponentRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,useWindowDimensions } from 'react-native';
import { supabase } from '@/services/supabase';
import { QuestionCard } from '@/components/question-card';
import { BattleStage, BattleResult, PixelSprite } from '@/components/battle-art';
import { router } from 'expo-router';
import { BattleRecords } from '@/components/battle-records';
import {useSound} from '@/hooks/sound-context';
import {CampaignMedals} from '@/components/campaign-medals';
import {BattleCelebration} from '@/components/battle-celebration';
import {enemyArt,campaignSize} from '@/constants/enemies';

type Enemy = { id: number; name: string; max_hp: number; attack: number };
type Battle = { id: string; enemy_id: number; player_hp: number; enemy_hp: number; enemy_max_hp: number;
  turn: number; heals_left: number; status: 'active' | 'won' | 'lost'; last_event: string; xp_awarded: number;
  attack_bonus: boolean; enemy_penalty: boolean; pending_question_id: string | null; last_question_id: string | null;
  correct_answers: number; wrong_answers: number; rules_version:number;intent_label:string;intent_damage:number;intent_heavy:boolean;defending:boolean;
  last_player_damage:number;last_enemy_damage:number;last_healing:number;energy:number;special_uses:number;intent_kind:string;last_enemy_healing:number };
type Action = 'attack' | 'defend' | 'heal'|'special';
type Pending = { kind: 'start'; enemy: number; operation: string } | { kind: 'action'; battle: string; action: Action; turn: number; operation: string }
  | { kind: 'answer'; battle: string; question: string; option: number; operation: string };
const operationId = () => `op-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export function BattlePanel({ userId, onProgress, mode }: { userId: string; onProgress: () => void; mode:'selection'|'combat' }) {
  const sound=useSound();
  const {width,height}=useWindowDimensions();
  const landscape=width>height&&width>=600;
  const [acknowledged,setAcknowledged]=useState<string|null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [unlocked, setUnlocked] = useState(1);
  const [defeated,setDefeated]=useState<number[]>([]);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [animation,setAnimation]=useState<{sequence:number;action:Action|null}>({sequence:0,action:null});
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  const viewing=mode==='combat';
  function setViewing(value:boolean){router.replace(value?'/battle':'/arena');}
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const executing = useRef(false);
  const live = useRef(true);
  const scrollRef=useRef<ComponentRef<typeof ScrollView>>(null);
  const storageKey = `focusbattle:pending-combat:${userId}`;
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    void (async () => {
      try {
        const [catalog, progress, latest, saved,rewards] = await Promise.all([
          client.from('enemies').select('id,name,max_hp,attack').order('id').abortSignal(controller.signal),
          client.from('player_progress').select('unlocked_enemy').eq('user_id', userId).abortSignal(controller.signal).single(),
          client.from('battles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle(),
          AsyncStorage.getItem(storageKey),
          client.from('enemy_rewards').select('enemy_id').eq('user_id',userId).abortSignal(controller.signal),
        ]);
        if (catalog.error || progress.error || latest.error||rewards.error) throw catalog.error || progress.error || latest.error||rewards.error;
        if (active) {
          setEnemies(catalog.data); setUnlocked(progress.data.unlocked_enemy); setBattle(latest.data);
          setDefeated(rewards.data.map(row=>row.enemy_id as number));
          setPending(saved ? JSON.parse(saved) : null); setReady(true);
          setMessage(previous => saved ? 'Hay una solicitud por confirmar. Pulsa Reintentar solicitud antes de continuar.' : previous.startsWith('No se pudo recuperar') ? '' : previous);
        }
      } catch { if (active) { setReady(false); setMessage('No se pudo recuperar la partida. Revisa tu conexión y vuelve a intentarlo.'); } }
      finally { clearTimeout(timeout); }
    })();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [userId, storageKey, revision]);

  async function execute(request: Pending) {
    if (!supabase || executing.current) return;
    executing.current = true; setBusy(true); setMessage('');
    try {
      // Se conserva antes de enviarse: un reinicio permite reintentar el mismo ID.
      await AsyncStorage.setItem(storageKey, JSON.stringify(request));
      if (live.current) setPending(request);
      const response = request.kind === 'start'
        ? await supabase.rpc('start_battle', { p_enemy_id: request.enemy, p_operation_id: request.operation }).abortSignal(AbortSignal.timeout(15000)).single()
        : request.kind === 'answer'
          ? await supabase.rpc('answer_battle_question', { p_battle_id: request.battle, p_question_id: request.question, p_option: request.option, p_operation_id: request.operation }).abortSignal(AbortSignal.timeout(15000)).single()
          : await supabase.rpc('battle_action', { p_battle_id: request.battle, p_action: request.action, p_operation_id: request.operation, p_expected_turn: request.turn }).abortSignal(AbortSignal.timeout(15000)).single();
      if (response.error) {
        if (['22023', '40001', '42501'].includes(response.error.code)) {
          await AsyncStorage.removeItem(storageKey);
          if (live.current) {
            setPending(null); setMessage(response.error.message); setReady(false); setRevision(value => value + 1);
          }
          return;
        }
        throw response.error;
      }
      const next = response.data as Battle;
      if (!next?.id || !['active', 'won', 'lost'].includes(next.status)) throw new Error('Estado inválido');
      await AsyncStorage.removeItem(storageKey);
      if (live.current) {
        const changed=!battle||next.id!==battle.id||next.turn!==battle.turn||next.correct_answers!==battle.correct_answers||next.wrong_answers!==battle.wrong_answers;
        if(changed){
          setAnimation(previous=>({sequence:previous.sequence+1,action:request.kind==='action'?request.action:null}));
          if(next.status==='won')sound.play('victory');else if(next.status==='lost')sound.play('defeat');
          else if(request.kind==='answer')sound.play(next.wrong_answers>(battle?.wrong_answers??0)?'wrong':'correct');
          else if(request.kind==='action')sound.play(request.action);
        }
        setBattle(next); setPending(null); if(mode==='selection')setViewing(true);
        if (next.status !== 'active') {
          if (next.status === 'won') setUnlocked(value => Math.max(value, Math.min(next.rules_version>=4?campaignSize:3, next.enemy_id + 1)));
          onProgress();
        }
      }
    } catch { if (live.current) setMessage('No se confirmó la solicitud. Revisa tu conexión y reintenta; no se aplicará dos veces.'); }
    finally { executing.current = false; if (live.current) setBusy(false); }
  }
  const disabled = busy || !!pending;
  const enemy = enemies.find(item => item.id === battle?.enemy_id);
  const terminal = battle && battle.status !== 'active';
  const feedbackPending=!!battle?.last_question_id&&!battle.pending_question_id&&acknowledged!==battle.last_question_id&&battle.status==='active';
  let attackDamage=battle?.attack_bonus?30:15;
  if(battle&&battle.rules_version>=3){if(battle.intent_kind==='evade')attackDamage=Math.ceil(attackDamage/2);if(battle.enemy_id===3)attackDamage+=battle.intent_kind==='vulnerable'?5:-5;}
  const controls=battle&&<View style={styles.actions}>
    {(['attack','defend','heal',...(battle.rules_version>=3?['special']:[])] as Action[]).map(action=><View style={[styles.actionCell,!landscape&&width<400&&{flexBasis:'45%'}]} key={action}><Button
      label={action==='attack'?`⚔ ATACAR\n${attackDamage} daño`:action==='defend'?'◇ DEFENDER\nEscudo':action==='special'?'✦ ESPECIAL\n45 · 2 energía':'✚ CURAR\n+20 HP'}
      disabled={disabled||!!battle.pending_question_id||feedbackPending||battle.status!=='active'||(action==='heal'&&(battle.heals_left===0||battle.player_hp===100))||(action==='special'&&(battle.energy??0)<2)}
      onPress={()=>void execute({kind:'action',battle:battle.id,action,turn:battle.turn,operation:operationId()})}/></View>)}
  </View>;
  const visual=battle?<>
    <Text style={styles.text}>{enemy?.name} · {enemyArt(battle.enemy_id).difficulty}</Text>
    <BattleStage key={battle.id} enemyId={battle.enemy_id} playerHp={battle.player_hp} enemyHp={battle.enemy_hp} status={battle.status} playerDamage={battle.last_player_damage} enemyDamage={battle.last_enemy_damage} healing={battle.last_healing} action={animation.action} sequence={animation.sequence} heavy={battle.intent_heavy} intent={battle.intent_kind}/>
    <BattleCelebration battleId={battle.id} status={battle.status} userId={userId}/>
    {battle.last_enemy_healing>0&&<Text style={styles.message}>{enemy?.name??'El rival'} recuperó {battle.last_enemy_healing} HP.</Text>}
    <Health label="Aventurero" hp={battle.player_hp} max={100}/><Health label={enemy?.name??'Enemigo'} hp={battle.enemy_hp} max={battle.enemy_max_hp}/>
    <Text style={styles.muted}>{terminal?`${battle.turn-1} acciones`:battle.pending_question_id?`Desafío del turno ${battle.turn-1}`:`Turno ${battle.turn}`} · Curaciones: {battle.heals_left}/2</Text>
    {battle.rules_version>=3&&<View style={styles.energy}><Text style={styles.energyText}>ENERGÍA {Array.from({length:3},(_,i)=>i<(battle.energy??0)?'◆':'◇').join(' ')} {battle.energy??0}/3</Text><Text style={styles.muted}>Acierta para cargarla · Especial: 2 energía</Text></View>}
  </>:null;
  const content=<>
    <Text style={styles.title}>{viewing?'ARENA DE COMBATE':'EL DESAFÍO TE ESPERA'}</Text>
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    {!ready ? <><ActivityIndicator color="#43BFA0" /><Button label="RECUPERAR PARTIDA" disabled={busy} onPress={() => setRevision(value => value + 1)} /></> : <>
      {pending && <Button label={busy ? 'CONFIRMANDO…' : 'REINTENTAR SOLICITUD'} disabled={busy} onPress={() => void execute(pending)} />}
      {!viewing ? <>
        {battle?.status === 'active' && <Button label="CONTINUAR PARTIDA" disabled={disabled} onPress={() => setViewing(true)} />}
        {terminal && <Button label="VER ÚLTIMO RESULTADO" disabled={disabled} onPress={() => setViewing(true)} />}
        <Pressable accessibilityRole="button" disabled={disabled} onPress={()=>router.push('/prepare')} style={styles.preparationLink}><Text style={styles.preparationLinkText}>✦ Ajustar intereses y dificultad ›</Text></Pressable>
        {enemies.map(item => <View style={[styles.enemy,{borderColor:enemyArt(item.id).color},item.id>unlocked && styles.lockedEnemy]} key={item.id}>
          <View style={styles.rivalTop}><Text style={styles.rivalRank}>{enemyArt(item.id).difficulty}</Text><Text style={styles.enemyNumber}>{item.id>unlocked?'BLOQUEADO':defeated.includes(item.id)?'DERROTADO':'DISPONIBLE'}</Text></View>
          <View style={styles.enemyHeading}><View style={[styles.portrait,{backgroundColor:enemyArt(item.id).background}]}><PixelSprite kind={enemyArt(item.id).sprite} pixel={5}/></View><View style={styles.enemyInfo}>
            <Text style={styles.enemyName}>{item.name}</Text>
            <Text style={styles.rivalStats}>{item.max_hp} HP   ·   {item.attack} ATAQUE BASE</Text>
            <Text style={styles.muted}>{enemyArt(item.id).pattern}</Text>
          </View></View>
          <View style={styles.rewardLine}><Text style={styles.rewardText}>{item.id>unlocked?'Derrota al rival anterior para desbloquear.':defeated.includes(item.id)?'Revancha ganada: +10 XP':'+50 XP primera victoria · +10 XP por revancha'}</Text></View>
          <Button label={item.id > unlocked ? 'RIVAL BLOQUEADO' :defeated.includes(item.id)?'VOLVER A DESAFIAR →':'DESAFIAR →'} disabled={disabled || item.id > unlocked || battle?.status === 'active'}
            onPress={() => void execute({ kind: 'start', enemy: item.id, operation: operationId() })} />
        </View>)}
        <BattleRecords/>
      </> : battle ? <>
        {!landscape&&visual}
        <Text style={styles.muted}>Aciertos: {battle.correct_answers ?? 0} · Errores: {battle.wrong_answers ?? 0}</Text>
        {battle.status==='active' && <View style={[styles.intent,battle.intent_heavy&&styles.heavy]}>
          <Text style={styles.intentLabel}>{battle.intent_heavy?'⚠ GOLPE FUERTE':'INTENCIÓN DEL RIVAL'}</Text>
          <Text style={styles.text}>{battle.intent_label??'Ataque'} · {battle.intent_damage??enemy?.attack} de daño</Text>
          {battle.intent_heavy&&battle.rules_version>=2&&<Text style={styles.muted}>Defender reduce el daño y prepara +15 para tu siguiente ataque.</Text>}
          {battle.intent_kind==='evade'&&<Text style={styles.muted}>Ataque normal: mitad de daño. El especial mantiene sus 45.</Text>}
          {battle.rules_version>=3&&battle.enemy_id===3&&<Text style={styles.muted}>{battle.intent_kind==='vulnerable'?'Ventana de ataque: +5 de daño normal.':'Armadura: −5 al daño normal. El especial la ignora.'}</Text>}
          {battle.defending&&<Text style={styles.shield}>◇ ESCUDO ACTIVO · daño reducido a la mitad</Text>}
        </View>}
        {(battle.attack_bonus || battle.enemy_penalty) && <Text style={styles.message}>{battle.attack_bonus ? 'Ataque potenciado +15. ' : ''}{battle.enemy_penalty ? 'Próximo contraataque +10.' : ''}</Text>}
        <Text accessibilityLiveRegion="polite" style={styles.event}>{battle.last_event}</Text>
        {!!(battle.pending_question_id || battle.last_question_id) && <QuestionCard battleId={battle.id}
          version={`${battle.pending_question_id}:${battle.correct_answers}:${battle.wrong_answers}`} disabled={disabled}
          energyEnabled={battle.rules_version>=3}
          onContinue={()=>{setAcknowledged(battle.last_question_id);scrollRef.current?.scrollTo({y:0,animated:false});}}
          onAnswer={(question, option) => void execute({ kind: 'answer', battle: battle.id, question, option, operation: operationId() })} />}
        {battle.status === 'active' ? <>
          <Text style={styles.muted}>{battle.pending_question_id ? 'El contraataque espera tu respuesta.' : 'Si el enemigo sobrevive, contraataca después de la acción y del desafío cuando corresponda.'}</Text>
          <Button label="VOLVER AL CAMPAMENTO" disabled={disabled} onPress={() => setViewing(false)} />
        </> : <>
          <BattleResult won={battle.status==='won'} xp={battle.xp_awarded} correct={battle.correct_answers??0} wrong={battle.wrong_answers??0} campaign={battle.status==='won'&&battle.enemy_id===campaignSize}/>
          {battle.status==='won'&&<BattleRecords key={battle.id} enemyId={battle.enemy_id}/>}
          {battle.status==='won'&&<CampaignMedals key={`medals-${battle.id}`}/>}
          <Button label="REINTENTAR ENEMIGO" disabled={disabled} onPress={() => void execute({ kind: 'start', enemy: battle.enemy_id, operation: operationId() })} />
          <Button label="CONTINUAR · ELEGIR ENEMIGO" disabled={disabled} onPress={() => setViewing(false)} />
        </>}
      </> : <Button label="ELEGIR RIVAL" onPress={()=>setViewing(false)}/>}
    </>}
  </>;
  return <View style={[styles.panel,mode==='combat'&&styles.combatPanel]}>
    {mode==='combat'?(landscape&&battle?<View style={styles.landscape}><ScrollView style={styles.visualPane} contentContainerStyle={styles.combatContent}>{visual}</ScrollView><ScrollView ref={scrollRef} style={styles.detailPane} contentContainerStyle={styles.combatContent}>{content}</ScrollView></View>:<ScrollView ref={scrollRef} contentContainerStyle={styles.combatContent}>{content}</ScrollView>):content}
    {mode==='combat'&&ready&&battle?.status==='active'&&<View style={styles.fixedControls}>
      {pending?<Button label={busy?'CONFIRMANDO…':'REINTENTAR SOLICITUD'} disabled={busy} onPress={()=>void execute(pending)}/>
        :battle.pending_question_id||feedbackPending?<Button label={feedbackPending?'VER EXPLICACIÓN Y CONTINUAR ↓':'IR AL DESAFÍO ↓'} onPress={()=>scrollRef.current?.scrollToEnd({animated:false})}/>:controls}
    </View>}
  </View>;
}
function Button({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={!!disabled} onPress={onPress} style={({pressed})=>[styles.button,disabled&&styles.disabled,pressed&&!disabled&&styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function Health({ label, hp, max }: { label: string; hp: number; max: number }) {
  return <View accessibilityLabel={`${label}: ${hp} de ${max} HP`}><Text style={styles.text}>{label} · {hp}/{max} HP</Text>
    <View style={styles.track}><View style={[styles.fill, { width: `${hp / max * 100}%`, backgroundColor: hp / max > 0.3 ? '#43BFA0' : '#D75B65' }]} /></View></View>;
}
const styles = StyleSheet.create({
  panel: { borderWidth: 2, borderColor: '#7855C8', backgroundColor: '#191c30', padding: 18, gap: 16 },
  combatPanel:{flex:1,padding:0,gap:0},combatContent:{padding:14,gap:14,paddingBottom:24},fixedControls:{borderTopWidth:1,borderColor:'#414864',backgroundColor:'#101321',padding:10},
  landscape:{flex:1,flexDirection:'row'},visualPane:{flex:1,borderRightWidth:1,borderColor:'#414864'},detailPane:{flex:1.15},energy:{backgroundColor:'#2a2242',padding:12,gap:6,borderWidth:1,borderColor:'#7855C8'},energyText:{color:'#d3bdff',fontSize:12,fontWeight:'bold',letterSpacing:1},
  intent:{backgroundColor:'#192e38',borderLeftWidth:3,borderColor:'#43BFA0',padding:12,gap:6},heavy:{backgroundColor:'#382932',borderColor:'#E9B949'},intentLabel:{color:'#E9B949',fontWeight:'bold',fontSize:10,letterSpacing:1},shield:{color:'#8ce8f0',fontSize:11,lineHeight:18},actions:{flexDirection:'row',flexWrap:'wrap',gap:7},actionCell:{flex:1,minWidth:65},
  title: { color: '#E9B949', fontWeight: 'bold', letterSpacing: 1 }, text: { color: '#f0ebff', lineHeight: 23 },
  muted: { color: '#bcb6cf', fontSize: 12, lineHeight: 20 }, message: { color: '#E9B949', lineHeight: 23 },
  enemy: { borderWidth: 1, borderColor: '#414864', padding: 17, gap: 14,borderRadius:16,backgroundColor:'#171e31' }, button: { backgroundColor: '#7855C8', paddingVertical:14,paddingHorizontal:8,minHeight:48,borderRadius:9 },
  rivalTop:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:7},rivalRank:{color:'#c7c1d7',fontSize:9,fontWeight:'bold',letterSpacing:1},portrait:{height:100,width:96,borderRadius:12,alignItems:'center',justifyContent:'center'},rivalStats:{color:'#d9c49a',fontSize:9,fontWeight:'bold',lineHeight:17},rewardLine:{borderTopWidth:1,borderColor:'#30384d',paddingTop:11},rewardText:{color:'#d6b975',fontSize:10,lineHeight:17},preparationLink:{paddingVertical:13,paddingHorizontal:15,borderRadius:10,backgroundColor:'#26243e'},preparationLinkText:{color:'#bea6e8',fontSize:11,fontWeight:'bold'},
  enemyHeading:{flexDirection:'row',alignItems:'center',gap:12},enemyInfo:{flex:1,gap:5},enemyNumber:{color:'#43BFA0',fontSize:9,letterSpacing:1},enemyName:{color:'#f0ebff',fontWeight:'bold',fontSize:16,lineHeight:22},lockedEnemy:{opacity:0.5},pressed:{backgroundColor:'#9571e0',transform:[{translateY:2}]},
  buttonText: { color: '#fff',fontSize:11, fontWeight: 'bold', textAlign: 'center', lineHeight: 21 }, disabled: { opacity: 0.45 },
  track: { backgroundColor: '#34384e', height: 12, marginTop: 6 }, fill: { height: 12 },
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#101321', paddingVertical: 30, borderBottomWidth: 6, borderBottomColor: '#414864' },
  caption: { fontSize: 10, color: '#bcb6cf', textAlign: 'center', marginTop: 12 }, vs: { color: '#E9B949', fontWeight: 'bold' },
  pixelRow: { flexDirection: 'row' }, event: { color: '#e9e5f5', backgroundColor: '#101321', padding: 14, lineHeight: 24 },
  result: { color: '#E9B949', fontWeight: 'bold', fontSize: 22 },
});
