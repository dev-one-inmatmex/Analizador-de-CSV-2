import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export let supabase: SupabaseClient | null = null

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'ADVERTENCIA: Las variables de entorno de Supabase no están configuradas. Las funcionalidades de la base de datos estarán deshabilitadas. Revisa tu archivo .env.'
    )
  }
}
