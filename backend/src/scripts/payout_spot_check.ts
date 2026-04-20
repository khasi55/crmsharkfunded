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

async function finalSpotCheck() {
    // 900909506905 was swapped to 900909609663
    const newLogin = 900909609663;
    const { data: payouts } = await supabase
        .from('payout_requests')
        .select('id, metadata')
        .filter('metadata->>mt5_login', 'eq', String(newLogin));
    
    console.log(`Payout requests for new login ${newLogin}: ${payouts?.length || 0}`);
    if (payouts && payouts.length > 0) {
        console.log(`Sample metadata: ${JSON.stringify(payouts[0].metadata, null, 2)}`);
    } else {
        // Try searching by number if it was stored as a number
        const { data: payoutsNum } = await supabase
            .from('payout_requests')
            .select('id, metadata')
            .filter('metadata->mt5_login', 'eq', newLogin);
        console.log(`Payout requests for new login ${newLogin} (number search): ${payoutsNum?.length || 0}`);
    }
}

finalSpotCheck();
