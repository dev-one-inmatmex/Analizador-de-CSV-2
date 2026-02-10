import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public client for client-side use.
// We use an IIFE (Immediately Invoked Function Expression) to conditionally initialize the const.
export const supabase: SupabaseClient | null = (() => {
    if (supabaseUrl && supabaseAnonKey) {
        try {
            return createClient(supabaseUrl, supabaseAnonKey);
        } catch (e) {
            console.error("Failed to create Supabase public client:", e);
            return null;
        }
    }
    // Only show warning in development
    if (process.env.NODE_ENV !== 'production') {
        console.warn("Supabase URL or Anon Key are not set. Public client will be unavailable.");
    }
    return null;
})();


// Admin client for server-side use (e.g., in Server Components, Route Handlers, Server Actions)
// This will only work if the service role key is set in the environment variables.
let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
    if (!supabaseUrl) {
         console.warn("Supabase URL is not set. Admin client will be unavailable.");
    } else if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn("Supabase service role key (SUPABASE_SERVICE_ROLE_KEY) is not set. Admin operations will not be available.");
    }
}

export { supabaseAdmin };
