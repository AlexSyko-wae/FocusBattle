import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAudioPlayer} from 'expo-audio';
type Sound='attack'|'defend'|'heal'|'correct'|'wrong'|'victory'|'special'|'defeat';
const Context=createContext<{enabled:boolean;toggle:()=>void;play:(name:Sound)=>void}|null>(null);
export function SoundProvider({children}:{children:ReactNode}){
 const [enabled,setEnabled]=useState(false);
 const enabledRef=useRef(false);
 const sequence=useRef(0);
 const attack=useAudioPlayer(require('../../assets/sounds/attack.wav'));
 const defend=useAudioPlayer(require('../../assets/sounds/defend.wav'));
 const heal=useAudioPlayer(require('../../assets/sounds/heal.wav'));
 const correct=useAudioPlayer(require('../../assets/sounds/correct.wav'));
 const wrong=useAudioPlayer(require('../../assets/sounds/wrong.wav'));
 const victory=useAudioPlayer(require('../../assets/sounds/victory.wav'));
 const special=useAudioPlayer(require('../../assets/sounds/special.wav'));
 const defeat=useAudioPlayer(require('../../assets/sounds/defeat.wav'));
 const players={attack,defend,heal,correct,wrong,victory,special,defeat};
 useEffect(()=>{
  let live=true;
  void AsyncStorage.getItem('focusbattle:sound').then(value=>{if(live){const next=value!=='off';enabledRef.current=next;setEnabled(next);}}).catch(()=>{});
  return()=>{live=false;};
 },[]);
 useEffect(()=>{
  const listener=AppState.addEventListener('change',state=>{if(state!=='active'){for(const player of [attack,defend,heal,correct,wrong,victory,special,defeat])player.pause();}});
  return()=>listener.remove();
 },[attack,defend,heal,correct,wrong,victory,special,defeat]);
 function toggle(){const next=!enabled;sequence.current++;enabledRef.current=next;setEnabled(next);if(!next)Object.values(players).forEach(player=>player.pause());void AsyncStorage.setItem('focusbattle:sound',next?'on':'off').catch(()=>{});}
 function play(name:Sound){
  if(!enabledRef.current||AppState.currentState!=='active')return;
  const player=players[name];
  const request=++sequence.current;
  try {Object.values(players).forEach(item=>item.pause());void player.seekTo(0).then(()=>{if(request===sequence.current&&enabledRef.current&&AppState.currentState==='active')player.play();}).catch(()=>{});}catch{/* El audio no bloquea la partida. */}
 }
 return <Context.Provider value={{enabled,toggle,play}}>{children}</Context.Provider>;
}
export function useSound(){const value=useContext(Context);if(!value)throw new Error('SoundProvider no disponible');return value;}
