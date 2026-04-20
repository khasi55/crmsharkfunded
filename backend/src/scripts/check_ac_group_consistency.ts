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

async function checkGroupConsistency() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/ac.csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '' && l.split(',')[0].trim() !== 'Auro');
    
    const accountPairs = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const oldLogin = parts[0];
        const newLogin = parts[2];
        const group = parts[1].replace(';', ''); 
        return { oldLogin, newLogin, group };
    }).filter(p => p.oldLogin && p.newLogin);

    const oldLogins = accountPairs.map(p => p.oldLogin);

    // Fetch existing logins and their groups
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('login, group')
        .in('login', oldLogins);

    if (error) {
        console.error("Error fetching challenges:", error);
        return;
    }

    const challengeMap = new Map(challenges.map(c => [String(c.login), c.group]));
    
    let matches = 0;
    let mismatches = 0;
    const mismatchDetails: any[] = [];

    accountPairs.forEach(p => {
        const dbGroup = challengeMap.get(p.oldLogin);
        if (dbGroup) {
            // Compare groups (dbGroup might have double slashes from JSON)
            const normalizedDbGroup = dbGroup.replace(/\\\\/g, '\\');
            if (normalizedDbGroup === p.group) {
                matches++;
            } else {
                mismatches++;
                mismatchDetails.push({ login: p.oldLogin, csvGroup: p.group, dbGroup: normalizedDbGroup });
            }
        }
    });

    console.log(`Total pairs in CSV: ${accountPairs.length}`);
    console.log(`Accounts found in DB: ${challenges.length}`);
    console.log(`Group matches: ${matches}`);
    console.log(`Group mismatches: ${mismatches}`);
    
    if (mismatches > 0) {
        console.log("\nSample mismatches:");
        mismatchDetails.slice(0, 5).forEach(m => {
            console.log(`Login: ${m.login} | CSV Group: ${m.csvGroup} | DB Group: ${m.dbGroup}`);
        });
    }
}

checkGroupConsistency();
