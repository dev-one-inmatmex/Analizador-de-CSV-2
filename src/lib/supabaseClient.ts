import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client for client-side use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side use (e.g., in Server Components, Route Handlers, Server Actions)
// This will only work if the service role key is set in the environment variables.
let supabaseAdmin: ReturnType<typeof createClient> | null = null;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
        supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    } catch (e) {
        console.error("Failed to create Supabase admin client:", e);
    }
} else if (process.env.NODE_ENV !== 'production') {
    console.warn("Supabase service role key (SUPABASE_SERVICE_ROLE_KEY) is not set. Admin operations will not be available.");
}

export { supabaseAdmin };
