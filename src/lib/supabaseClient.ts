import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // This warning will show up in the server console during build/dev
  console.warn('ADVERTENCIA: Faltan las variables de entorno públicas de Supabase (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY). La conexión con la base de datos no funcionará.');
}

// We export the client, which might be null.
// Components and flows that use it are responsible for checking if it's null.
export { supabase };
