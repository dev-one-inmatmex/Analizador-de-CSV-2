import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error('Configuración de Supabase incompleta. Por favor, edita el archivo .env con tus credenciales reales de Supabase y reinicia el servidor.')
}

// Aquí inicializamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
