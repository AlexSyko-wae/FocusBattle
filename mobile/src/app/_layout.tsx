import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/services/supabase';
import { AccountProvider } from '@/hooks/account-context';
import { SoundProvider } from '@/hooks/sound-context';
export default function Layout() {
  useEffect(() => {
    function refresh(state: string | null | undefined) {
      if (state === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    }
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => { listener.remove(); supabase?.auth.stopAutoRefresh(); };
  }, []);
  return <SafeAreaProvider><AccountProvider><SoundProvider><Stack screenOptions={{ headerShown: false,contentStyle:{backgroundColor:'#101321'} }} /></SoundProvider></AccountProvider></SafeAreaProvider>;
}
