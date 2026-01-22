import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Verificación de que las variables de entorno están presentes y no son los valores de ejemplo
export const isSupabaseConfigured = 
    !!supabaseUrl && 
    !!supabaseAnonKey && 
    !supabaseUrl.includes('hpfclglvfxgikexuvtwu') && 
    !supabaseAnonKey.includes('sb_publishable_Oc2_ZECQIIW4TY_Q9jEIqw_MhBLZc3V');

export const supabase: SupabaseClient | null = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!isSupabaseConfigured) {
    console.warn("ADVERTENCIA: Las credenciales de Supabase no están configuradas en el archivo .env. La funcionalidad de la base de datos estará deshabilitada.");
}
