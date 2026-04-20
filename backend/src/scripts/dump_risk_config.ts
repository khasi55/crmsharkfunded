
import { supabase } from '../lib/supabase';

async function run() {
    console.log("--- RISK RULES CONFIG ---");
    const { data: riskConfigs, error } = await supabase.from('risk_rules_config').select('*').limit(10);
    if (error) {
        console.error("Error fetching risk_rules_config:", error);
    } else {
        console.log("Risk Configs:", JSON.stringify(riskConfigs, null, 2));
    }

    console.log("\n--- SEARCHING FOR LITE GROUPS ---");
    const { data: matches } = await supabase.from('mt5_risk_groups').select('*').ilike('group_name', '%S%');
    console.log("MT5 Risk Groups (Lite?):", JSON.stringify(matches, null, 2));
}

run();
