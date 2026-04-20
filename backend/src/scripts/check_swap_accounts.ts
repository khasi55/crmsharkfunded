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

async function checkAccounts() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/New1 (1).csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    
    // Skip header: Auro,Ocean Markets,
    const accountPairs = lines.slice(1).map(line => {
        const [oldLogin, newLogin] = line.split(',').map(s => s.trim());
        return { oldLogin, newLogin };
    });

    console.log(`Total pairs found in CSV: ${accountPairs.length}`);

    const oldLogins = accountPairs.map(p => p.oldLogin);
    const newLogins = accountPairs.map(p => p.newLogin);

    // Check old logins
    const { data: oldChallenges, error: oldError } = await supabase
        .from('challenges')
        .select('id, login, user_id, status')
        .in('login', oldLogins);

    if (oldError) {
        console.error("Error fetching old challenges:", oldError);
        return;
    }

    console.log(`Found ${oldChallenges?.length || 0} existing 'Auro' (old) challenges.`);

    // Check new logins
    const { data: newChallenges, error: newError } = await supabase
        .from('challenges')
        .select('id, login, user_id, status')
        .in('login', newLogins);

    if (newError) {
        console.error("Error fetching new challenges:", newError);
        return;
    }

    console.log(`Found ${newChallenges?.length || 0} existing 'Ocean Markets' (new) challenges.`);

    if (newChallenges && newChallenges.length > 0) {
        console.log("Example new challenges already in DB:", newChallenges.slice(0, 5));
    }
}

checkAccounts();
