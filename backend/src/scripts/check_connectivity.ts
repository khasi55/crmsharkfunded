
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testConnectivity() {
    console.log('🔍 Starting Connectivity Diagnostics...\n');

    // 1. Test Supabase
    console.log('📡 Testing Supabase Connection context...');
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    try {
        const start = Date.now();
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log(`✅ Supabase: Basic connection OK! (took ${Date.now() - start}ms)`);

        console.log('\n📋 Testing Manual Wallets Join Logic...');
        const { data: wallets, error: wError } = await supabase
            .from('wallet_addresses')
            .select('*')
            .limit(5);
        if (wError) throw wError;
        if (wallets && wallets.length > 0) {
            const userIds = [...new Set(wallets.map((w: any) => w.user_id).filter(Boolean))];
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
            console.log(`✅ Wallets: Found ${wallets.length} wallets and ${profiles?.length || 0} profiles.`);
        }

        console.log('\n📋 Testing Manual Payout Requests Join Logic...');
        const { data: requests, error: rError } = await supabase
            .from('payout_requests')
            .select('*')
            .limit(5);
        if (rError) throw rError;
        if (requests && requests.length > 0) {
            const userIds = [...new Set(requests.map((r: any) => r.user_id).filter(Boolean))];
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
            console.log(`✅ Requests: Found ${requests.length} requests and ${profiles?.length || 0} profiles.`);
        }
    } catch (err: any) {
        console.error(`❌ Supabase: Test Failed!`);
        console.error(`   Error Message: ${err.message}`);
    }

    console.log('\n🏁 Diagnostics Complete.');
    process.exit(0);
}

testConnectivity();
