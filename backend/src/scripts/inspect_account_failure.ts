
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAccount(login: string) {
    console.log(`--- Inspecting Account ${login} ---`);

    // 1. Get Challenge Details
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (challengeError) {
        console.error('Challenge Fetch Error:', challengeError.message);
    } else {
        console.log('Challenge Status:', challenge.status);
        console.log('Current Balance:', challenge.current_balance);
        console.log('Current Equity:', challenge.current_equity);
        console.log('SOD Equity:', challenge.start_of_day_equity);
        console.log('Metadata:', JSON.stringify(challenge.metadata, null, 2));
    }

    // 2. Look for Risk Violations
    console.log('\n--- Checking Risk Violations ---');
    const { data: violations, error: violationsError } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    if (violationsError) {
        console.error('Violations Fetch Error:', violationsError.message);
    } else if (violations && violations.length > 0) {
        console.log(`Found ${violations.length} violations:`);
        violations.forEach((v, i) => {
            console.log(`[${i}] ${v.violation_type} at ${v.created_at}: ${v.description}`);
            console.log(`    Values: Equity=${v.equity}, Balance=${v.balance}, Limit=${v.limit}`);
        });
    } else {
        console.log('No risk violations found.');
    }
}

inspectAccount('900909492845');
