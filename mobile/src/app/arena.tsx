import { GameScreen } from '@/components/game-screen';
import { BattlePanel } from '@/components/battle-panel';
import { useAccount } from '@/hooks/account-context';
export default function Arena(){const account=useAccount();return <GameScreen title="ELIGE TU RIVAL">{account.session&&<BattlePanel key={account.session.user.id} userId={account.session.user.id} onProgress={account.refresh} mode="selection"/>}</GameScreen>;}
