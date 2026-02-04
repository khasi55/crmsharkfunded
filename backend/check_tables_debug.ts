
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env file manually relative to this script
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("Checking for table existence...");

    // Check mt5_risk_groups (used by app)
    const { data: appData, error: appError } = await supabase
        .from('mt5_risk_groups')
        .select('*')
        .limit(5);

    if (appError) {
        console.log("❌ mt5_risk_groups: ERROR", appError.message);
    } else {
        console.log(`✅ mt5_risk_groups: Found ${appData.length} rows`);
        if (appData.length > 0) console.log("Sample:", appData[0]);
    }

    // Check risk_rules_config (potentially used by user)
    const { data: userData, error: userError } = await supabase
        .from('risk_rules_config')
        .select('*')
        .limit(5);

    if (userError) {
        console.log("❌ risk_rules_config: ERROR (might not exist)", userError.message);
    } else {
        console.log(`✅ risk_rules_config: Found ${userData.length} rows`);
        if (userData.length > 0) console.log("Sample:", userData[0]);
    }

    // Check specific group 'demo\SF\0-Pro' in BOTH
    const targetGroup = 'demo\\SF\\0-Pro'; // Note double backslash for JS string, likely matches DB or needs one output

    console.log(`\nSearching for group containing '0-Pro' in both tables...`);

    if (appData) {
        const { data: match1 } = await supabase.from('mt5_risk_groups').select('*').ilike('group_name', '%0-Pro%');
        console.log(`mt5_risk_groups matches:`, match1);
    }

    if (userData) {
        const { data: match2 } = await supabase.from('risk_rules_config').select('*').ilike('group_name', '%0-Pro%');
        console.log(`risk_rules_config matches:`, match2);
    }
}

checkTables();
