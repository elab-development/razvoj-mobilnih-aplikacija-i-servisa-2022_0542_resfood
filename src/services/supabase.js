import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase kredencijali - anon key je javni ključ, bezbedan za klijentski kod
const supabaseUrl = 'https://ehycpvealyunjqpwaplz.supabase.co';
const supabaseAnonKey = 'sb_publishable_42Vfp66m9CbBQUItwrBeUA_rgzYJ5dQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
