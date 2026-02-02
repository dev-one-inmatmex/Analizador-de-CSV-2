import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

// Cliente público para el lado del cliente (navegador)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente de administrador para el lado del servidor (omite RLS)
// Se usará en flujos de Genkit y acciones de servidor que requieran permisos elevados.
export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
   : null;
