
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
    const groupName = "demo\\SF\\0-Demo\\comp";
    console.log(`Inserting missing group: ${groupName}`);

    const payload = {
        mt5_group_name: groupName,
        max_total_drawdown_percent: 11.0,
        max_daily_loss_percent: 4.0,
        min_trade_duration_seconds: 120, // Default we set for others
        is_active: true,
        allow_weekend_trading: true,
        allow_news_trading: true,
        allow_ea_trading: true
    };

    const { data, error } = await supabase
        .from('risk_rules_config')
        .insert(payload)
        .select();

    if (error) {
        console.error('Error inserting group:', error);
    } else {
        console.log('Insert Success:', JSON.stringify(data, null, 2));
    }
}

main();
