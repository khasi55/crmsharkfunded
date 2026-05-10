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

async function checkAcAccounts() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/ac.csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '' && l.split(',')[0].trim() !== 'Auro');
    
    const accountPairs = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const oldLogin = parts[0];
        const newLogin = parts[2];
        return { oldLogin, newLogin };
    }).filter(p => p.oldLogin && p.newLogin);

    console.log(`Total pairs found in ac.csv: ${accountPairs.length}`);

    const oldLogins = accountPairs.map(p => p.oldLogin);
    const newLogins = accountPairs.map(p => p.newLogin);

    // Check old logins
    const { data: oldChallenges, error: oldError } = await supabase
        .from('challenges')
        .select('id, login, status, initial_balance')
        .in('login', oldLogins);

    if (oldError) {
        console.error("Error fetching old challenges:", oldError);
        return;
    }

    console.log(`Found ${oldChallenges?.length || 0} existing 'Auro' (old) challenges.`);

    // Check new logins
    const { data: newChallenges, error: newError } = await supabase
        .from('challenges')
        .select('id, login, status')
        .in('login', newLogins);

    if (newError) {
        console.error("Error fetching new challenges:", newError);
        return;
    }

    console.log(`Found ${newChallenges?.length || 0} existing 'Xylo Markets Ltd' (new) challenges.`);

    // List some old accounts that were found
    if (oldChallenges && oldChallenges.length > 0) {
        console.log("\nSample existing accounts found:");
        oldChallenges.slice(0, 10).forEach(c => {
             console.log(`Login: ${c.login} | Status: ${c.status} | Max (Balance): ${c.initial_balance}`);
        });
    }
}

checkAcAccounts();
