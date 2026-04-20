process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Custom fetch with retry
const fetchWithRetry = async (url: any, options?: RequestInit, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok && res.status === 525) {
                console.log(`Received 525 SSL Handshake Failed from Cloudflare. Retrying... (${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            return res;
        } catch (err: any) {
            console.log(`Fetch error: ${err.message}. Retrying... (${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return fetch(url, options); // last attempt
};

const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false },
    global: { fetch: fetchWithRetry as any }
});

async function main() {
    console.log("Checking for accounts breached yesterday...");

    // Yesterday start (midnight local time)
    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const startOfYesterdayStr = startOfYesterday.toISOString();

    // Yesterday end (midnight local time today)
    const endOfYesterday = new Date();
    endOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterdayStr = endOfYesterday.toISOString();

    console.log(`Date timeframe: ${startOfYesterdayStr} to ${endOfYesterdayStr}`);

    // Query 1: accounts table
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('id, status, updated_at')
        .eq('status', 'breached')
        .gte('updated_at', startOfYesterdayStr)
        .lt('updated_at', endOfYesterdayStr);

    if (accErr) {
        console.error('Error fetching accounts table:', accErr.message || accErr);
    } else {
        console.log(`[accounts table] Accounts updated to 'breached' yesterday: ${accounts?.length || 0}`);
    }

    // Query 2: challenges table
    const { data: challenges, error: cfErr } = await supabase
        .from('challenges')
        .select('id, status, updated_at')
        .in('status', ['breached', 'failed'])
        .gte('updated_at', startOfYesterdayStr)
        .lt('updated_at', endOfYesterdayStr);

    if (cfErr) {
        console.error('Error fetching challenges table:', cfErr.message || cfErr);
    } else {
        console.log(`[challenges table] Challenges updated to 'breached' or 'failed' yesterday: ${challenges?.length || 0}`);
    }

    // Query 3: risk_events table
    const { data: riskEvents, error: riskErr } = await supabase
        .from('risk_events')
        .select('account_id, event_type, created_at')
        .in('event_type', ['daily_drawdown_breach', 'max_drawdown_breach', 'account_breach', 'breach'])
        .gte('created_at', startOfYesterdayStr)
        .lt('created_at', endOfYesterdayStr);

    if (riskErr) {
        console.error('Error fetching risk_events table:', riskErr.message || riskErr);
    } else {
        const uniqueAccounts = new Set(riskEvents?.map(r => r.account_id));
        console.log(`[risk_events table] Unique accounts with breach events yesterday: ${uniqueAccounts.size}`);
    }
}

main().catch(console.error);
