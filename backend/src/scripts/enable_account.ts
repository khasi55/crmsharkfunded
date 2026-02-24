
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { enableMT5Account } from '../lib/mt5-bridge';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableAccount(login: string) {
    console.log(`Checking account: ${login}`);

    // 1. Get Challenge from DB
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (error || !challenge) {
        console.error('Challenge not found:', error?.message);
        return;
    }

    console.log(`Current status: ${challenge.status}`);

    // 2. Update status in DB if not active
    if (challenge.status !== 'active') {
        const { error: updateError } = await supabase
            .from('challenges')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', challenge.id);

        if (updateError) {
            console.error('Failed to update status in DB:', updateError.message);
            return;
        }
        console.log('Status updated to active in DB.');
    } else {
        console.log('Status is already active in DB.');
    }

    // 3. Enable in MT5 Bridge
    try {
        console.log(`Sending enable command to bridge for login ${login}...`);
        const result = await enableMT5Account(Number(login));
        console.log('✅ Account successfully enabled on bridge:', result);
    } catch (err: any) {
        console.error('❌ Bridge communication error:', err.message);
    }
}

const login = process.argv[2];
if (!login) {
    console.error('Usage: ts-node enable_account.ts <login>');
    process.exit(1);
}

enableAccount(login);
