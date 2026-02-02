import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Using console.error instead of throwing an error to avoid crashing the server on build.
  console.error('ADVERTENCIA: Faltan las variables de entorno públicas de Supabase. El cliente público no funcionará.')
}
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// --- Admin Client for server-side operations ---
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

if (supabaseUrl && serviceKey && serviceKey !== supabaseAnonKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
} else if (serviceKey && serviceKey === supabaseAnonKey) {
    console.warn('ADVERTENCIA: Tu SUPABASE_SERVICE_ROLE_KEY es la misma que tu llave pública (anon). Esto no concederá permisos de escritura. Usa la llave "service_role".')
} else {
  console.warn('ACCIÓN REQUERIDA: La variable SUPABASE_SERVICE_ROLE_KEY no está en tu archivo .env. La aplicación funcionará, pero no podrás guardar datos en la base de datos hasta que la configures.')
}

export { supabaseAdmin }
