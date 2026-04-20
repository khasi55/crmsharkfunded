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

async function findMissingAccounts() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/ac.csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '' && l.split(',')[0].trim() !== 'Auro');
    
    const accountPairs = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const oldLogin = parts[0];
        const newLogin = parts[2];
        const group = parts[1].replace(';', ''); // Remove leading semicolon
        return { oldLogin, newLogin, group };
    }).filter(p => p.oldLogin && p.newLogin);

    const oldLogins = accountPairs.map(p => p.oldLogin);

    // Fetch existing logins
    const { data: existingChallenges, error } = await supabase
        .from('challenges')
        .select('login')
        .in('login', oldLogins);

    if (error) {
        console.error("Error fetching existing challenges:", error);
        return;
    }

    const existingLoginSet = new Set(existingChallenges.map(c => String(c.login)));
    
    const missing = accountPairs.filter(p => !existingLoginSet.has(p.oldLogin));

    console.log(`Total pairs in CSV: ${accountPairs.length}`);
    console.log(`Missing from DB: ${missing.length}`);
    
    if (missing.length > 0) {
        console.log("\nSample missing accounts:");
        missing.slice(0, 10).forEach(m => {
            console.log(`Old Login: ${m.oldLogin} | New Login: ${m.newLogin} | Group: ${m.group}`);
        });
    }
}

findMissingAccounts();
