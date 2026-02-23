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
    console.error(`[Supabase Lib] CRITICAL ERROR: Missing SUPABASE_SERVICE_ROLE_KEY or URL.`);
    console.error(`[Supabase Lib] Current process.cwd(): ${process.cwd()}`);
    console.error(`[Supabase Lib] Available Env Keys (Partial): ${Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC')).join(', ')}`);
}

const finalUrl = supabaseUrl!;
// STRICT: In the backend, we MUST use the Service Role Key for workers
// If it's missing, falling back to ANON is almost always WRONG for the sync worker
const finalKey = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseKey && finalKey === supabaseKey) {
    console.log('[Supabase Lib] ✅ Initialized using SERVICE_ROLE_KEY');
} else if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && finalKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Supabase Lib] ❌ WARNING: Initialized using ANON_KEY. RLS violations WILL occur in syncing!');
} else {
    console.error('[Supabase Lib] ❌ CRITICAL: No valid Supabase key found at all.');
}

if (!finalUrl || !finalKey) {
    console.error('[Supabase Lib] FATAL: Cannot create client - missing URL or Key.');
}

// Export a SERVICE ROLE client (Admin access)
export const supabase = createClient(finalUrl || '', finalKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export const supabaseAdmin = supabase;

// Create a temporary client for auth verification without mutating the global service role client
export const createEphemeralClient = () => {
    return createClient(finalUrl || '', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || finalKey) || '', {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
            storageKey: `ephemeral_auth_${Math.random().toString(36).substring(7)}`
        }
    });
};
