import {GameScreen} from '@/components/game-screen';
import {CampaignMedals} from '@/components/campaign-medals';
import {useAccount} from '@/hooks/account-context';
export default function Medals(){const account=useAccount();return <GameScreen title="SALA DE CONQUISTAS">{account.session&&<CampaignMedals key={account.session.user.id}/>}</GameScreen>;}
