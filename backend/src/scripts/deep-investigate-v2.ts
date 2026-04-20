import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = process.argv[2];
    if (!login) {
        console.error("Please provide a login as an argument.");
        process.exit(1);
    }

    console.log(`Deep Investigation for account: ${login}`);

    // 1. Fetch Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (cError) {
        console.error("Error fetching account:", cError.message);
        return;
    }

    console.log(`Current Status: ${challenge.status}`);
    console.log(`Group: ${challenge.group}`);

    // 2. Fetch Core Risk Violations
    const { data: violations, error: vError } = await supabase
        .from('core_risk_violations')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    if (vError) {
        console.error("Error fetching core_risk_violations:", vError.message);
    } else if (violations && violations.length > 0) {
        console.log(`\nFound ${violations.length} core violations:`);
        violations.forEach(v => {
            console.log(`[${v.created_at}] Type: ${v.violation_type}`);
            console.log(`Description: ${v.description}`);
            console.log(`Amount: ${v.amount}, Threshold: ${v.threshold}`);
            console.log('---');
        });
    } else {
        console.log("\nNo core violations found.");
    }

    // 3. Fetch Risk Rules for this account group
    const { data: rules, error: rError } = await supabase
        .from('risk_rules')
        .select('*')
        .eq('group_name', challenge.group)
        .single();

    if (rError) {
        console.log(`No specific risk rules found for group ${challenge.group}, checking defaults...`);
        const { data: defaultRules } = await supabase
            .from('risk_rules')
            .eq('group_name', 'DEFAULT')
            .single();
        if (defaultRules) console.log('Default Rules:', defaultRules);
    } else {
        console.log('\nRisk Rules for Group:', rules);
    }
}

main();
