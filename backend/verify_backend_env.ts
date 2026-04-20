import { supabase } from './src/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

async function verifyEnv() {
    console.log('--- Backend Runtime Environment Verification ---');
    console.log('Current CWD:', process.cwd());
    
    // Check various .env locations
    const possibleEnvPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'backend/.env'),
        path.resolve(__dirname, '../../.env'),
    ];

    possibleEnvPaths.forEach(p => {
        const found = require('fs').existsSync(p);
        console.log(`Checking ${p}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');
    console.log('SERVICE_ROLE_KEY:', serviceRoleKey ? `${serviceRoleKey.substring(0, 10)}...` : 'MISSING');
    console.log('ANON_KEY:', anonKey ? `${anonKey.substring(0, 20)}...` : 'MISSING');

    if (serviceRoleKey && serviceRoleKey.startsWith('sb_')) {
        console.warn('⚠️ WARNING: Using a local development key (sb_...) against a live URL might cause issues.');
    }

    try {
        const { data: users, error } = await supabase.auth.admin.listUsers({ limit: 1 });
        if (error) {
            console.error('❌ auth.admin.listUsers FAILED:', error.message);
        } else {
            console.log('✅ auth.admin.listUsers SUCCESS: Service Role Key is VALID.');
        }
    } catch (e: any) {
        console.error('❌ auth.admin.listUsers UNEXPECTED ERROR:', e.message);
    }
}

verifyEnv();
