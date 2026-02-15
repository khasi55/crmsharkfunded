
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const groupName = "demo\\S\\2-SF"; // Needs double escape for string literal
    console.log(`Updating limits for group: ${groupName}`);

    // Update to 4% Daily Drawdown (and ensure Max DD is correct if needed, user didn't specify but assumingly 6% is fine? User said "4% not 3%")
    const { data, error } = await supabase
        .from('risk_rules_config')
        .update({
            daily_drawdown_percent: 4,
            // resetting min_trade_duration_seconds to 120 just in case 
        })
        .eq('mt5_group_name', groupName)
        .select();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Update Success. Modified rows:', data.length);
        console.log('New Config:', JSON.stringify(data, null, 2));
    }
}

main();
