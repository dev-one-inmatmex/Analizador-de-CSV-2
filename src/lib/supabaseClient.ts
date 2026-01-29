import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

let supabase: SupabaseClient | null = null

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Only log the warning in the browser to avoid spamming server logs
  if (typeof window !== 'undefined') {
    console.warn(
      'La configuración de Supabase está incompleta. Por favor, edita el archivo .env con tus credenciales y reinicia el servidor.'
    )
  }
}

export { supabase }
