import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const groupName = 'demo\\SF\\2-Pro';

async function checkRules() {
    console.log(`Checking rules for group: ${groupName}...`);

    // Check mt5_risk_groups
    const { data: riskGroups, error: rgError } = await supabase
        .from('mt5_risk_groups')
        .select('*')
        .ilike('group_name', groupName.replace(/\\/g, '\\\\'));

    if (rgError) {
        console.error('Error fetching mt5_risk_groups:', rgError);
    } else {
        console.log('MT5 Risk Groups:', JSON.stringify(riskGroups, null, 2));
    }

    // Check risk_rules_config
    const { data: riskRules, error: rrError } = await supabase
        .from('risk_rules_config')
        .select('*')
        .ilike('mt5_group_name', groupName.replace(/\\/g, '\\\\'));

    if (rrError) {
        console.error('Error fetching risk_rules_config:', rrError);
    } else {
        console.log('\nRisk Rules Config:', JSON.stringify(riskRules, null, 2));
    }
}

checkRules();
