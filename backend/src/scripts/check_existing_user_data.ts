import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const existingUserId = '67be4a1d-e1df-47dc-a69c-58b171eaa182';

    console.log(`Checking data for existing user: akshitfx18@gmail.com (${existingUserId})`);

    // Check MT5 accounts
    const { data: mt5, error: e1 } = await supabase.from('mt5_accounts').select('login').eq('user_id', existingUserId);
    console.log(`MT5 Accounts:`, mt5?.length || 0, e1?.message || '');

    // Check orders
    const { data: orders, error: e2 } = await supabase.from('orders').select('id').eq('user_id', existingUserId);
    console.log(`Orders:`, orders?.length || 0, e2?.message || '');

    // Check payouts
    const { data: payouts, error: e3 } = await supabase.from('payouts').select('id').eq('user_id', existingUserId);
    console.log(`Payouts:`, payouts?.length || 0, e3?.message || '');
}

main();
