import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = 
    !!supabaseUrl && 
    !!supabaseAnonKey && 
    supabaseUrl !== 'https://hpfclglvfxgikexuvtwu.supabase.co' && 
    supabaseAnonKey !== 'sb_publishable_Oc2_ZECQIIW4TY_Q9jEIqw_MhBLZc3V';

export const supabase: SupabaseClient | null = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
