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

async function verifyAcSwap() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/ac.csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '' && l.split(',')[0].trim() !== 'Auro');
    
    // Parse pairs
    const accountPairs = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const oldLogin = parts[0];
        const newLogin = parts[2];
        return { oldLogin, newLogin };
    }).filter(p => p.oldLogin && p.newLogin);

    // Filter only those that existed in the DB initially (we know this was 43)
    // Actually, we can just check if any of the OLD logins still exist.
    const oldLogins = accountPairs.map(p => p.oldLogin);
    const newLogins = accountPairs.map(p => p.newLogin);

    const { data: remainingOld } = await supabase
        .from('challenges')
        .select('login')
        .in('login', oldLogins);

    console.log(`Old logins from ac.xlsx remaining in DB: ${remainingOld?.length || 0}`);

    const { data: foundNew } = await supabase
        .from('challenges')
        .select('login')
        .in('login', newLogins);

    console.log(`New logins from ac.xlsx found in DB: ${foundNew?.length || 0}`);

    // Spot check a payout update
    const spotNewLogin = '900909609663'; // from earlier success logs
    const { data: payouts } = await supabase
        .from('payout_requests')
        .select('id, metadata')
        .filter('metadata->>mt5_login', 'eq', spotNewLogin);
    
    console.log(`Payout requests for ${spotNewLogin}: ${payouts?.length || 0}`);
}

verifyAcSwap();
