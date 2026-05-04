import { createClient } from '@supabase/supabase-js';
import { PUBLIC_ENV } from './publicEnv';

const supabaseUrl = PUBLIC_ENV.SUPABASE_URL;
const supabaseAnonKey = PUBLIC_ENV.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found in environment variables. Connect to Supabase to enable real-time features.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
