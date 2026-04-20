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

async function inspectTrades() {
    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching sample trade:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in trades table:');
        console.log(Object.keys(data[0]).join(', '));
    } else {
        console.log('No records found in trades table.');
    }
}

inspectTrades();
