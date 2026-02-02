import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client for use in browser environments
let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('ADVERTENCIA: Faltan las variables de entorno públicas de Supabase (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY). Las operaciones del lado del cliente fallarán.');
}

// Admin client for use in server environments (Genkit flows, Server Actions)
let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
} else {
    // This warning is crucial for the user.
    console.warn("ADVERTENCIA: La variable de entorno SUPABASE_SERVICE_ROLE_KEY no está configurada. Las operaciones de escritura en la base de datos desde el servidor (como la sincronización de CSV) fallarán.");
}

export { supabase, supabaseAdmin };
