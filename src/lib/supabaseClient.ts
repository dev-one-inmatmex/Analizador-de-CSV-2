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


// --- Admin Client (for server-side/secure use) ---
let supabaseAdmin: SupabaseClient | null = null;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && serviceKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceKey);
}

export { supabaseAdmin };
