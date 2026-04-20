
import { supabase } from '../lib/supabase';

async function run() {
    console.log("--- RISK RULES CONFIG FULL ---");
    const { data: riskConfigs, error } = await supabase.from('risk_rules_config').select('*').limit(1);
    if (error) {
        console.error("Error fetching risk_rules_config:", error);
    } else if (riskConfigs && riskConfigs.length > 0) {
        console.log("Risk Rules Config columns:", Object.keys(riskConfigs[0]));
        console.log("Sample:", JSON.stringify(riskConfigs[0], null, 2));
    } else {
        console.log("No config found.");
    }
}

run();
