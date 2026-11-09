import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key && !url.includes('YOUR_PROJECT')
  ? createClient(url, key, { auth: {
    storage: AsyncStorage, persistSession: true, autoRefreshToken: true,
    detectSessionInUrl: false, lock: processLock,
  } }) : null;
