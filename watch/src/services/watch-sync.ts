import type {SupabaseClient} from '@supabase/supabase-js';
import {createSnapshotLoader} from './snapshot-loader.ts';
export type WatchState={
 player:{id:string;display_name:string;total_xp:number;level:number;wins:number;losses:number};
 battle:null|{id:string;enemy_name:string;player_hp:number;enemy_hp:number;enemy_max_hp:number;turn:number;status:'active'|'won'|'lost';pending_question:boolean;last_event:string};
};
export type Connection='connecting'|'live'|'reconnecting'|'offline'|'error';
type Environment={online:()=>boolean;visible:()=>boolean;window:Pick<Window,'addEventListener'|'removeEventListener'>;document:Pick<Document,'addEventListener'|'removeEventListener'>};
export function startWatchSync({client,userId,token,channelName,onData,onConnection,onRestart,environment}:{
 client:SupabaseClient;userId:string;token:string;channelName:string;onData:(data:WatchState)=>void;onConnection:(state:Connection)=>void;onRestart:()=>void;environment:Environment;
}){
 let live=true;let subscribed=false;
 let retry:ReturnType<typeof setTimeout>|undefined;
 const retryConnection=()=>{
  if(!live||retry||!environment.online())return;
  retry=setTimeout(()=>{retry=undefined;if(live)onRestart();},4000);
 };
 const loader=createSnapshotLoader(async signal=>{
  const {data,error}=await client.rpc('get_watch_state').abortSignal(signal);
  if(error||!data||data.player?.id!==userId)throw error??new Error('Perfil no disponible');
  return data as WatchState;
 },data=>{
  if(!live)return;
  onData(data);
  onConnection(!environment.online()?'offline':subscribed?'live':'connecting');
  if(subscribed){clearTimeout(retry);retry=undefined;}else retryConnection();
 },()=>{
  if(live){onConnection(environment.online()?'error':'offline');retryConnection();}
 });
 const channel=client.channel(channelName);
 const invalidate=()=>loader.request();
 channel.on('postgres_changes',{event:'*',schema:'public',table:'battles',filter:`user_id=eq.${userId}`},invalidate)
  .on('postgres_changes',{event:'*',schema:'public',table:'player_progress',filter:`user_id=eq.${userId}`},invalidate)
  .on('postgres_changes',{event:'*',schema:'public',table:'profiles',filter:`id=eq.${userId}`},invalidate);
 onConnection(environment.online()?'connecting':'offline');
 if(environment.online())loader.request();
 void client.realtime.setAuth(token).then(()=>{
  if(!live)return;
  channel.subscribe(status=>{
   if(!live)return;
   subscribed=status==='SUBSCRIBED';
   if(subscribed)loader.request();
   else{onConnection(environment.online()?'reconnecting':'offline');retryConnection();}
  });
 }).catch(()=>{if(live){onConnection(environment.online()?'error':'offline');retryConnection();}});
 const resume=()=>{
  if(!live||!environment.online()||!environment.visible())return;
  onConnection('reconnecting');onRestart();
 };
 const offline=()=>{if(live){subscribed=false;onConnection('offline');}};
 const focus=()=>{if(live&&environment.online()&&environment.visible())loader.requestIfIdle();};
 environment.window.addEventListener('online',resume);
 environment.window.addEventListener('offline',offline);
 environment.window.addEventListener('focus',focus);
 environment.window.addEventListener('pageshow',resume);
 environment.document.addEventListener('visibilitychange',resume);
 // Corrige un evento perdido sin depender de otro movimiento.
 const reconcile=setInterval(()=>{
  if(!live||!environment.online()||!environment.visible())return;
  loader.requestIfIdle();
  if(!subscribed)retryConnection();
 },5000);
 return()=>{
  if(!live)return;
  live=false;loader.close();clearTimeout(retry);clearInterval(reconcile);
  environment.window.removeEventListener('online',resume);
  environment.window.removeEventListener('offline',offline);
  environment.window.removeEventListener('focus',focus);
  environment.window.removeEventListener('pageshow',resume);
  environment.document.removeEventListener('visibilitychange',resume);
  void client.removeChannel(channel).catch(()=>{});
 };
}
