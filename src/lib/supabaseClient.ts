import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Verificación más robusta de que las variables de entorno están presentes y no son los valores de ejemplo
const hasUrl = typeof supabaseUrl === 'string' && supabaseUrl.length > 0;
const hasKey = typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0;

export const isSupabaseConfigured = 
    hasUrl &&
    hasKey &&
    !supabaseUrl.includes('hpfclglvfxgikexuvtwu') && 
    !supabaseAnonKey.includes('sb_publishable_Oc2_ZECQIIW4TY_Q9jEIqw_MhBLZc3V');

export const supabase: SupabaseClient | null = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!isSupabaseConfigured) {
    console.warn("ADVERTENCIA DE CONFIGURACIÓN: No se encontraron las credenciales de Supabase en el archivo .env. La aplicación se ejecutará, pero las funciones de base de datos no funcionarán hasta que añadas tus credenciales y reinicies el servidor.");
}
