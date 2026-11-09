import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startWatchSync} from '../watch/src/services/watch-sync.ts';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const state=(hp=100,status='active',id='battle-1')=>({player:{id:'user-1',display_name:'Aventurero',total_xp:0,level:1,wins:0,losses:0},battle:{id,enemy_name:'Dragón',player_hp:hp,enemy_hp:190,enemy_max_hp:190,turn:1,status,pending_question:false,last_event:'Inicio'}});
function fixture(t){
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 let data=state();let fetcher=async()=>({data,error:null});let subscription;let calls=0;let removed=0;let restarts=0;let online=true;let visible=true;
 const window=new EventTarget();const document=new EventTarget();const events=new Map();const results=[];const connections=[];const filters=[];
 const channel={on(_type,filter,callback){events.set(filter.table,callback);filters.push(filter);return channel;},subscribe(callback){subscription=callback;callback('SUBSCRIBED');return channel;}};
 const client={channel:()=>channel,realtime:{setAuth:async token=>assert.equal(token,'token')},rpc:name=>{assert.equal(name,'get_watch_state');return {abortSignal:signal=>{calls++;return fetcher(signal);}};},removeChannel:async()=>{removed++;}};
 const close=startWatchSync({client,userId:'user-1',token:'token',channelName:'test-watch',onData:value=>results.push(value),onConnection:value=>connections.push(value),onRestart:()=>restarts++,environment:{online:()=>online,visible:()=>visible,window,document}});
 t.after(close);
 return {results,connections,filters,events,window,document,close,setData:value=>{data=value;},setFetcher:value=>{fetcher=value;},status:value=>subscription(value),setOnline:value=>{online=value;window.dispatchEvent(new Event(value?'online':'offline'));},setVisible:value=>{visible=value;document.dispatchEvent(new Event('visibilitychange'));},calls:()=>calls,removed:()=>removed,restarts:()=>restarts};
}
test('suscribe solo tablas del usuario y sincroniza daño, preguntas, curación y XP',async t=>{
 const f=fixture(t);await flush();assert.equal(f.connections.at(-1),'live');
 assert.deepEqual(f.filters.map(x=>[x.table,x.filter]),[['battles','user_id=eq.user-1'],['player_progress','user_id=eq.user-1'],['profiles','id=eq.user-1']]);
 const next=state(72);next.battle.enemy_hp=110;next.battle.turn=5;next.battle.pending_question=true;
 f.setData(next);f.events.get('battles')();await flush();assert.deepEqual(f.results.at(-1),next);
 const healed=structuredClone(next);healed.battle.enemy_hp=130;healed.battle.pending_question=false;healed.player.total_xp=310;
 f.setData(healed);f.events.get('player_progress')();f.events.get('battles')();await flush();assert.deepEqual(f.results.at(-1),healed);
});
test('recupera el final perdido por WebSocket y después una pelea nueva',async t=>{
 const f=fixture(t);await flush();const won=state(65,'won');won.battle.enemy_hp=0;won.player.wins=1;won.player.total_xp=50;
 f.setData(won);t.mock.timers.tick(5000);await flush();assert.deepEqual(f.results.at(-1),won);
 f.setData(state(100,'active','battle-2'));f.events.get('battles')();await flush();assert.equal(f.results.at(-1).battle.id,'battle-2');
});
test('consulta lenta no pierde su respuesta por las comprobaciones periódicas',async t=>{
 const f=fixture(t);await flush();let resolve;
 f.setFetcher(()=>new Promise(ok=>{resolve=ok;}));f.events.get('battles')();const calls=f.calls();
 t.mock.timers.tick(10000);assert.equal(f.calls(),calls);
 const next=state(44);resolve({data:next,error:null});await flush();assert.deepEqual(f.results.at(-1),next);
});
test('pantalla dormida suspende comprobación y volver visible solicita renovar canal',async t=>{
 const f=fixture(t);await flush();f.setVisible(false);const calls=f.calls();
 t.mock.timers.tick(10000);await flush();assert.equal(f.calls(),calls);assert.equal(f.restarts(),0);
 f.setVisible(true);assert.equal(f.restarts(),1);assert.equal(f.connections.at(-1),'reconnecting');
});
test('pérdida de red y error de canal solicitan recuperación; cierre limpia recursos',async t=>{
 const f=fixture(t);await flush();f.setOnline(false);assert.equal(f.connections.at(-1),'offline');
 f.setOnline(true);assert.equal(f.restarts(),1);
 f.status('CHANNEL_ERROR');t.mock.timers.tick(4000);assert.equal(f.restarts(),2);
 f.close();const count=f.calls();t.mock.timers.tick(20000);f.window.dispatchEvent(new Event('focus'));f.document.dispatchEvent(new Event('visibilitychange'));await flush();
 assert.equal(f.calls(),count);assert.equal(f.removed(),1);assert.equal(f.restarts(),2);
});
test('rechaza datos de otro usuario y no publica una respuesta tras cerrar',async t=>{
 const f=fixture(t);await flush();const count=f.results.length;const wrong=state();wrong.player.id='otro';f.setData(wrong);f.events.get('battles')();await flush();
 assert.equal(f.results.length,count);assert.equal(f.connections.at(-1),'error');
 let resolve;f.setFetcher(()=>new Promise(ok=>{resolve=ok;}));f.events.get('battles')();f.close();resolve({data:state(1),error:null});await flush();assert.equal(f.results.length,count);
});
