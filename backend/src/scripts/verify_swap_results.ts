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

async function verifySwap() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/New1 (1).csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    
    // Skip header: Auro,Xylo Markets Ltd,
    const accountPairs = lines.slice(1).map(line => {
        const [oldLogin, newLogin] = line.split(',').map(s => s.trim());
        return { oldLogin, newLogin };
    });

    const oldLogins = accountPairs.map(p => p.oldLogin);
    const newLogins = accountPairs.map(p => p.newLogin);

    // 1. Check if any old logins still exist
    const { data: oldChallenges } = await supabase
        .from('challenges')
        .select('login')
        .in('login', oldLogins);

    console.log(`Old logins remaining in DB: ${oldChallenges?.length || 0}`);

    // 2. Check if all new logins exist
    const { data: newChallenges } = await supabase
        .from('challenges')
        .select('login')
        .in('login', newLogins);

    console.log(`New logins found in DB: ${newChallenges?.length || 0} / ${newLogins.length}`);

    // 3. Check payout_requests metadata for a sample new login
    if (newLogins.length > 0) {
        const sampleNewLogin = newLogins[0];
        const { data: payouts } = await supabase
            .from('payout_requests')
            .select('id, metadata')
            .filter('metadata->>mt5_login', 'eq', sampleNewLogin);
        
        console.log(`Payout requests for sample new login ${sampleNewLogin}: ${payouts?.length || 0}`);
    }
}

verifySwap();
