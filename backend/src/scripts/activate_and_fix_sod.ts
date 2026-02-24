import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { enableMT5Account } from '../lib/mt5-bridge';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';
const BRIDGE_API_KEY = process.env.MT5_API_KEY || 'shark-bridge-secret';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAndActivate(login: string) {
    console.log(`\n🚀 Starting Activation & SOD Fix for account: ${login}`);

    try {
        // 1. Fetch LIVE data via check-bulk (safe way to get current equity)
        console.log(`🔗 Fetching live data from bridge...`);
        const bulkResponse = await fetch(`${BRIDGE_URL}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': BRIDGE_API_KEY
            },
            body: JSON.stringify([{
                login: Number(login),
                min_equity_limit: -999999999,
                disable_account: false,
                close_positions: false
            }])
        });

        if (!bulkResponse.ok) {
            throw new Error(`Bridge check-bulk failed: ${bulkResponse.statusText}`);
        }

        const bulkData = await bulkResponse.json() as any[];
        const bridgeData = bulkData.find(d => Number(d.login) === Number(login));

        if (!bridgeData) {
            throw new Error(`Live data not found for account ${login} in bridge response`);
        }

        const liveEquity = bridgeData.equity;
        const liveBalance = bridgeData.balance;
        console.log(`✅ Live Data: Equity=${liveEquity}, Balance=${liveBalance}`);

        // 2. Enable account on bridge
        console.log(`🔗 Enabling account on bridge...`);
        const enableResult = await enableMT5Account(Number(login));
        console.log(`✅ Bridge Enable Response:`, JSON.stringify(enableResult));

        // 3. Update Supabase
        console.log(`💾 Updating database status and SOD...`);
        const { error: dbError } = await supabase
            .from('challenges')
            .update({
                status: 'active',
                is_active: true,
                start_of_day_equity: liveEquity,
                current_equity: liveEquity,
                current_balance: liveBalance,
                updated_at: new Date().toISOString()
            })
            .eq('login', login);

        if (dbError) {
            throw new Error(`Database update failed: ${dbError.message}`);
        }

        console.log(`✅ Account ${login} successfully updated in DB.`);

    } catch (error: any) {
        console.error(`❌ Error processing account ${login}:`, error.message);
    }
}

async function main() {
    const accounts = ['900909492933', '900909492934'];

    for (const login of accounts) {
        await syncAndActivate(login);
    }

    console.log('\n✨ All operations complete.');
}

main();
