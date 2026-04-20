
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function deepSearch() {
    const typoId = 'bb0c3755-5dd6-4086-86fd-53fbb50164af';
    
    // List of tables likely to have user_id
    const tables = [
        'challenges', 'payment_orders', 'orders', 'wallet_addresses', 
        'payout_requests', 'kyc_sessions', 'notifications', 
        'affiliate_earnings', 'referrals', 'user_scalping_violations'
    ];

    console.log(`--- Deep Search for ID: ${typoId} ---`);
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', typoId);
            
            if (error) {
                // table might not exist or not have user_id
                continue;
            }
            if (count && count > 0) {
                console.log(`Table ${table}: Found ${count} records`);
            }
        } catch (e) {}
    }
}

deepSearch();
