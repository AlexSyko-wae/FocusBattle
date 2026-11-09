import { router } from 'expo-router';
import { GameScreen } from '@/components/game-screen';
import { LearningPreferences } from '@/components/learning-preferences';
import { useAccount } from '@/hooks/account-context';
export default function Prepare(){const account=useAccount();return <GameScreen title="PREPARA TU AVENTURA">{account.session&&<LearningPreferences key={account.session.user.id} userId={account.session.user.id} saveLabel="GUARDAR Y ELEGIR RIVAL →" onSaved={()=>router.replace('/arena')}/>}</GameScreen>;}
