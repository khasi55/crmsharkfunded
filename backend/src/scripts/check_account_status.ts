import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAccount(login: number) {
    // 1. Check DB
    const { data: account, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();
    
    if (error) {
        console.error('Error fetching account from DB:', error);
    } else {
        console.log('--- Database Account Details ---');
        console.log(`Login: ${account.login}`);
        console.log(`Status: ${account.status}`);
        console.log(`Current Equity (DB): ${account.current_equity}`);
        console.log(`Updated At: ${account.updated_at}`);
    }

    // 2. Check Bridge trades
    console.log('\n--- Bridge Trades (Last 30 days) ---');
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    try {
        const response = await fetch(`${bridgeUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey || '',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ login, from: thirtyDaysAgo })
        });
        const data = await response.json() as any;
        const trades = data.trades || [];
        console.log(`Found ${trades.length} trades on bridge.`);
        if (trades.length > 0) {
            console.log('Latest 5 trades:');
            console.log(JSON.stringify(trades.slice(-5), null, 2));
        }
    } catch (e: any) {
        console.error('Error fetching trades from bridge:', e.message);
    }

    // 3. Check Bulk (for current equity)
    console.log('\n--- Bridge Real-time Equity ---');
    try {
        const response = await fetch(`${bridgeUrl}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey || '',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify([{ login, min_equity_limit: 0 }])
        });
        const data = await response.json() as any;
        if (data && data[0]) {
            console.log(`Real-time Equity: ${data[0].equity}`);
            console.log(`Real-time Balance: ${data[0].balance}`);
        } else {
            console.log('No data returned from check-bulk');
        }
    } catch (e: any) {
        console.error('Error calling check-bulk:', e.message);
    }
}

const login = process.argv[2] ? parseInt(process.argv[2]) : 900909502152;
checkAccount(login);
