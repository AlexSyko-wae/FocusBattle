import { createContext, useContext, type ReactNode } from 'react';
import { usePlayer } from '@/hooks/use-player';
const AccountContext=createContext<ReturnType<typeof usePlayer>|null>(null);
export function AccountProvider({children}:{children:ReactNode}) {
  const account=usePlayer();
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const value=useContext(AccountContext);
  if(!value)throw new Error('AccountProvider no disponible');
  return value;
}
