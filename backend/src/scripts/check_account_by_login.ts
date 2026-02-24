import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const loginId = process.argv[2] || '900909492845';

async function checkAccount() {
    console.log(`Checking account with login ${loginId}...`);
    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', loginId);

    if (error) {
        console.error('Error fetching account:', error);
        return;
    }

    if (accounts && accounts.length > 0) {
        console.log('Account Details:', JSON.stringify(accounts, null, 2));

        const challengeId = accounts[0].id;

        // Also check violation logs
        const { data: violations } = await supabase
            .from('risk_violations')
            .select('*')
            .eq('challenge_id', challengeId);

        if (violations && violations.length > 0) {
            console.log('\nViolation Logs (Core):', JSON.stringify(violations, null, 2));
        } else {
            console.log('\nNo core violation logs found.');
        }

        // Check advanced risk flags
        const { data: advancedFlags } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('challenge_id', challengeId);

        if (advancedFlags && advancedFlags.length > 0) {
            console.log('\nAdvanced Risk Flags:', JSON.stringify(advancedFlags, null, 2));
        } else {
            console.log('\nNo advanced risk flags found.');
        }

        // Check recent trades
        const { data: trades } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('open_time', { ascending: false })
            .limit(10);

        if (trades && trades.length > 0) {
            console.log('\nRecent Trades:', JSON.stringify(trades, null, 2));
        } else {
            console.log('\nNo trades found.');
        }

        // Check system logs
        const { data: logs } = await supabase
            .from('system_logs')
            .select('*')
            .ilike('message', `%${loginId}%`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (logs && logs.length > 0) {
            console.log('\nRecent System Logs:', JSON.stringify(logs, null, 2));
        } else {
            console.log('\nNo system logs found for this login.');
        }

    } else {
        console.log('Account not found with login:', loginId);
    }
}

checkAccount();
