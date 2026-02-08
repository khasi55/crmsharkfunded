
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkRiskSchema() {
    console.log("Checking risk_rules_config schema...");
    const { data, error } = await supabase
        .from('risk_rules_config')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching risk_rules_config:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
        const hasHedging = Object.keys(data[0]).includes('allow_hedging');
        const hasMartingale = Object.keys(data[0]).includes('allow_martingale');
        console.log(`Has allow_hedging: ${hasHedging}`);
        console.log(`Has allow_martingale: ${hasMartingale}`);
    } else {
        console.log("Table exists but is empty. Cannot determine columns from data.");
        // Try information_schema approach if table is empty
    }
}

checkRiskSchema();
