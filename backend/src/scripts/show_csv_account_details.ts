import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function showAccountDetails() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/New1 (1).csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    
    // Skip header: Auro,Ocean Markets,
    const oldLogins = lines.slice(1).map(line => {
        const [oldLogin] = line.split(',').map(s => s.trim());
        return oldLogin;
    });

    console.log(`Checking ${oldLogins.length} accounts from CSV...`);

    const { data, error } = await supabase
        .from('challenges')
        .select('login, initial_balance, status')
        .in('login', oldLogins);

    if (error) {
        console.error("Error fetching account details:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No matching accounts found in database.");
        return;
    }

    console.log('Account Number (Login) | Max (Initial Balance) | Status');
    console.log('---------------------------------------------------------');
    data.forEach(row => {
        console.log(`${String(row.login).padEnd(22)} | ${String(row.initial_balance).padEnd(21)} | ${row.status}`);
    });
    
    console.log(`\nTotal accounts found: ${data.length}`);
}

showAccountDetails();
