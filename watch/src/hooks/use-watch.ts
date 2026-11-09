import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '../services/supabase';
import {startWatchSync,type WatchState,type Connection} from '../services/watch-sync';
export type {WatchState} from '../services/watch-sync';
export function useWatch(session:Session){
 const [snapshot,setSnapshot]=useState<{user:string;data:WatchState;time:number}|null>(null);
 const [connection,setConnection]=useState<Connection>('connecting');
 const [revision,setRevision]=useState(0);
 const userId=session.user.id;const token=session.access_token;
 useEffect(()=>{
  if(!supabase)return;
  return startWatchSync({client:supabase,userId,token,channelName:`watch-${userId}-${revision}`,
   onData:data=>setSnapshot({user:userId,data,time:Date.now()}),onConnection:setConnection,
   onRestart:()=>setRevision(value=>value+1),
   environment:{online:()=>navigator.onLine,visible:()=>document.visibilityState==='visible',window,document},
  });
 },[userId,token,revision]);
 return {data:snapshot?.user===userId?snapshot.data:null,updatedAt:snapshot?.user===userId?snapshot.time:null,connection,
  reconnect:()=>{setConnection('reconnecting');setRevision(value=>value+1);}};
}
