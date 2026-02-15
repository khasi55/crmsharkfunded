
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const login = 900909492949;
    console.log(`Checking breach details for account ${login}...`);

    // 1. Get Challenge ID
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('id, status')
        .eq('login', login)
        .single();

    if (challengeError || !challenge) {
        console.error('Challenge not found:', challengeError?.message);
        return;
    }

    console.log('Challenge Status:', challenge.status);

    // 2. Check Risk Violations
    const { data: violations } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    console.log('\n--- Risk Violations ---');
    if (violations && violations.length > 0) {
        violations.forEach(v => {
            console.log(`[${v.created_at}] Type: ${v.violation_type}`);
            console.log(`Details:`, JSON.stringify(v.details, null, 2));
        });
    } else {
        console.log('No risk violations found.');
    }

    // 3. Check Advanced Risk Flags
    const { data: flags } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    console.log('\n--- Advanced Risk Flags ---');
    if (flags && flags.length > 0) {
        flags.forEach(f => {
            console.log(`[${f.created_at}] Type: ${f.flag_type}, Severity: ${f.severity}`);
            console.log(`Description: ${f.description}`);
            console.log(`Details:`, JSON.stringify(f.analysis_data, null, 2));
        });
    } else {
        console.log('No advanced risk flags found.');
    }
}

main();
