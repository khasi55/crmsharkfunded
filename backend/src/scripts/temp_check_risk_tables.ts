
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRiskConfig() {
    try {
        console.log('--- Checking mt5_risk_groups ---');
        const { data: riskGroups } = await supabase.from('mt5_risk_groups').select('*').limit(3);
        if (riskGroups && riskGroups.length > 0) {
            console.log('Columns:', Object.keys(riskGroups[0]));
            // console.log('Sample Data:', JSON.stringify(riskGroups, null, 2));
            for (const rg of riskGroups) {
                console.log(`Group: ${rg.group_name}, Daily: ${rg.daily_drawdown_percent}%, Max: ${rg.max_drawdown_percent}%`);
            }
        } else {
            console.log('No data in mt5_risk_groups');
        }

        console.log('\n--- Checking challenge_type_rules ---');
        const { data: rules } = await supabase.from('challenge_type_rules').select('*').limit(5);
        if (rules && rules.length > 0) {
            console.log('Columns:', Object.keys(rules[0]));
            for (const rule of rules) {
                console.log(`Type: ${rule.challenge_type}, Daily: ${rule.daily_drawdown_percent}%, Max: ${rule.max_drawdown_percent}%, Profit: ${rule.profit_target_percent}%`);
            }
        } else {
            console.log('No data in challenge_type_rules');
        }

        console.log('\n--- Checking risk_rules_config ---');
        const { data: riskRulesConfig } = await supabase.from('risk_rules_config').select('*').limit(5);
        if (riskRulesConfig && riskRulesConfig.length > 0) {
            console.log('Columns:', Object.keys(riskRulesConfig[0]));
            for (const config of riskRulesConfig) {
                console.log(`Group: ${config.mt5_group_name}, Single Loss %: ${config.max_single_loss_percent}, Day Trading: ${config.allow_weekend_trading}`);
            }
        } else {
            console.log('No data in risk_rules_config');
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

checkRiskConfig();
