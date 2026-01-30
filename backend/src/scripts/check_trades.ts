import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey) as any;

async function checkTrades() {
    console.log('Fetching latest 5 trades...');

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching trades:', error);
        return;
    }

    if (!trades || trades.length === 0) {
        console.log('No trades found.');
        return;
    }

    console.log('--- Latest Trades Sample ---');
    trades.forEach((t: any) => {
        console.log(`ID: ${t.id} | Symbol: ${t.symbol}`);
        console.log(`Type: ${t.type} (Raw DB Value)`);
        console.log(`Lots: ${t.lots} (Raw DB Value)`);
        console.log(`Volume: ${t.volume} (If exists)`);
        console.log(`Open Price: ${t.open_price} | Close Price: ${t.close_price}`);
        console.log('---');
    });
}

checkTrades();
