import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // This might not exist, alternative below

    if (error) {
        // Fallback to a query if RPC is not available
        const { data: tables, error: tableError } = await supabase
            .from('challenges')
            .select('*')
            .limit(0); // Just a dummy call to see if we can get schema info or just list some known tables
        
        console.log("Could not list tables via RPC. Checking common tables manually.");
        const commonTables = ['challenges', 'trades', 'payout_requests', 'profiles', 'orders', 'payment_orders', 'kyc_sessions', 'wallet_addresses', 'bank_details', 'notifications'];
        console.log("Common tables:", commonTables.join(', '));
        return;
    }

    console.log('Tables:', data);
}

listTables();
