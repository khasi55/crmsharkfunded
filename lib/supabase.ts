import { createClient } from '@supabase/supabase-js';

// NOTE: This client should ONLY be used on the server-side.
// It uses the SERVICE_ROLE_KEY to bypass Row Level Security (RLS)
// for admin tasks like Trade Ingestion and Risk Analysis.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV === 'production') {
        console.error('Missing Supabase Environment Variables!');
    }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
