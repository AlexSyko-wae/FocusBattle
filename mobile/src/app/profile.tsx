import { router } from 'expo-router';
import { Text } from 'react-native';
import { GameScreen,MenuButton } from '@/components/game-screen';
import { PlayerStatistics } from '@/components/player-statistics';
import { useAccount } from '@/hooks/account-context';
import {useSound} from '@/hooks/sound-context';
import {CampaignMedals} from '@/components/campaign-medals';
export default function Profile(){const account=useAccount();const sound=useSound();return <GameScreen title="PERFIL Y PROGRESO">{account.session&&<><PlayerStatistics key={account.session.user.id}/><CampaignMedals key={`medals-${account.session.user.id}`}/></>}<MenuButton label={sound.enabled?'SONIDO: ACTIVADO':'SONIDO: SILENCIADO'} detail="Toca para cambiar. Se recuerda en este dispositivo." secondary onPress={sound.toggle}/><MenuButton label={account.busy?'CERRANDO…':'CERRAR SESIÓN'} secondary onPress={()=>{if(!account.busy)void account.signOut().then(()=>router.replace('/'));}}/>{!!account.message&&<Text style={{color:'#E9B949'}}>{account.message}</Text>}</GameScreen>;}
