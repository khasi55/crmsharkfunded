import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load env from multiple possible locations to be 100% sure
const possibleEnvPaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend/.env'),
    '.env'
];

for (const envPath of possibleEnvPaths) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase Lib] CRITICAL: SUPABASE_SERVICE_ROLE_KEY or URL is missing.');
}

const finalUrl = supabaseUrl!;
const finalKey = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (finalKey === process.env.SUPABASE_SERVICE_ROLE_KEY && finalKey) {
    console.log('[Supabase Lib] Initialized using SERVICE_ROLE_KEY');
} else if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && finalKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[Supabase Lib] WARNING: Initialized using ANON_KEY. RLS violations will occur.');
} else {
    console.error('[Supabase Lib] CRITICAL: No valid Supabase key found.');
}

// Export a SERVICE ROLE client (Admin access)
export const supabase = createClient(finalUrl, finalKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export const supabaseAdmin = supabase;
