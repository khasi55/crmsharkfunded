import { supabase } from '../lib/supabase';
import { enableMT5Account } from '../lib/mt5-bridge';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const LOGIN = 889224262;

async function run() {
    console.log(`🔌 Enabling account ${LOGIN}...`);

    try {
        // 1. Enable on MT5 Bridge
        const bridgeResult = await enableMT5Account(LOGIN);
        console.log('✅ Bridge result:', bridgeResult);

        // 2. Update status in Database
        const { data, error } = await supabase
            .from('challenges')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('login', LOGIN)
            .select();

        if (error) {
            console.error('❌ Database update failed:', error.message);
        } else if (data && data.length > 0) {
            console.log(`✅ Database status updated to "active" for ID: ${data[0].id}`);
        } else {
            console.warn('⚠️ No account found in database with this login.');
        }
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

run();
