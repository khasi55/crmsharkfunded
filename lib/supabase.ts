import { createClient } from '@supabase/supabase-js';

// NOTE: This client should ONLY be used on the server-side.
// It uses the SERVICE_ROLE_KEY to bypass Row Level Security (RLS)
// for admin tasks like Trade Ingestion and Risk Analysis.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    // Only log in production runtime, or warning in dev
    if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Missing Supabase Env Vars in lib/supabase.ts (Using Fallback)');
    }
}

// Fallback for build time to prevent "supabaseUrl is required" error
const urlToUse = supabaseUrl || 'https://placeholder.supabase.co';
const keyToUse = supabaseServiceKey || 'placeholder-key';

export const supabaseAdmin = createClient(urlToUse, keyToUse, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
