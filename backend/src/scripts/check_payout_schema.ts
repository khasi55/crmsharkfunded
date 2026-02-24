
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env file manually relative to this script
const envPath = path.resolve(__dirname, '../../.env');
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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking payout_requests schema...");
    const { data: payoutSample, error: payoutError } = await supabase
        .from('payout_requests')
        .select('*')
        .limit(1);

    if (payoutError) {
        console.error("Error fetching payout_requests:", payoutError.message);
    } else if (payoutSample && payoutSample.length > 0) {
        console.log("payout_requests columns:", Object.keys(payoutSample[0]));
        console.log("Sample row:", payoutSample[0]);
    } else {
        console.log("payout_requests table is empty.");
    }

    console.log("\nChecking details for potential bank-related tables...");
    const potentialTables = ['bank_details', 'bank_accounts', 'payout_methods', 'user_banks', 'wallet_addresses'];
    for (const table of potentialTables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
            console.log(`\nTable '${table}' exists.`);
            if (data && data.length > 0) {
                console.log(`Columns:`, Object.keys(data[0]));
                console.log(`Sample row:`, data[0]);
            } else {
                console.log(`Table is empty.`);
            }
        } else {
            console.log(`❌ Table '${table}' check error: ${error.message}`);
        }
    }
}

checkSchema();
