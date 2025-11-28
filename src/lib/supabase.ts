import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const LEGACY_SUPABASE_URL = 'https://qkkmurwntbkhvbezbhcz.supabase.co';
const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const resolvedSupabaseUrl =
  envSupabaseUrl &&
  !envSupabaseUrl.includes('YOUR_PROJECT') &&
  envSupabaseUrl.trim().length > 0
    ? envSupabaseUrl
    : LEGACY_SUPABASE_URL;

const resolvedSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!resolvedSupabaseAnonKey || resolvedSupabaseAnonKey.includes('YOUR_ANON_KEY')) {
  console.warn(
    '⚠️  Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Set it in your .env file using the anon key from Supabase → Settings → API (Project ref: qkkmurwntbkhvbezbhcz).'
  );
}

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('coaches').select('count');
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return false;
    }
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
    return false;
  }
};

