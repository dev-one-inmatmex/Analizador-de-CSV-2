import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Public Client (for client-side use) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ADVERTENCIA: Faltan las variables de entorno públicas (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY). El cliente público de Supabase no funcionará.'
  );
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);


// --- Admin Client (for server-side use only) ---
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else if (process.env.NODE_ENV !== 'production') {
  console.warn(
    'ADVERTENCIA: La SUPABASE_SERVICE_ROLE_KEY no está configurada en .env. Las operaciones de escritura (guardar en DB) fallarán.'
  );
}

export { supabaseAdmin };
