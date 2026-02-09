
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Checking mt5_risk_groups...");
    const { data: groups, error: errorGroups } = await supabase.from('mt5_risk_groups').select('*').limit(1);
    if (errorGroups) console.error("Error fetching mt5_risk_groups:", errorGroups);
    else if (groups.length > 0) console.log("mt5_risk_groups columns:", Object.keys(groups[0]));
    else console.log("mt5_risk_groups is empty.");

    console.log("\nChecking risk_rules_config...");
    const { data: config, error: errorConfig } = await supabase.from('risk_rules_config').select('*').limit(1);
    if (errorConfig) console.error("Error fetching risk_rules_config:", errorConfig);
    else if (config.length > 0) console.log("risk_rules_config columns:", Object.keys(config[0]));
    else console.log("risk_rules_config is empty.");
}

main();
