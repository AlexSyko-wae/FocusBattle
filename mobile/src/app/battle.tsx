import { GameScreen } from '@/components/game-screen';
import { BattlePanel } from '@/components/battle-panel';
import { useAccount } from '@/hooks/account-context';
export default function Battle(){const account=useAccount();return <GameScreen title="COMBATE" scroll={false}>{account.session&&<BattlePanel key={account.session.user.id} userId={account.session.user.id} onProgress={account.refresh} mode="combat"/>}</GameScreen>;}
