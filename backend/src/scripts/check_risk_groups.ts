
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
    console.log('Fetching risk_rules_config to inspect group names...');
    const { data: riskRules } = await supabase
        .from('risk_rules_config')
        .select('*');

    if (riskRules) {
        console.log('Found Rules:');
        riskRules.forEach(r => {
            console.log(`ID: ${r.id}, Group: "${r.mt5_group_name}"`);
            console.log(`   Logic: "${r.mt5_group_name.replace(/\\\\/g, '\\').toLowerCase()}"`);
        });
    } else {
        console.log('No rules found.');
    }
}

main();
