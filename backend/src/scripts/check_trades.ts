import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTrades() {
    const targetId = '08308eb1-dea2-40ae-9d10-5f75cccb06b4';

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', targetId)
        .order('close_time', { ascending: false });

    if (error) {
        console.error('Error fetching trades:', error);
        return;
    }

    console.log(`\n📋 TRADES for ${targetId}`);
    console.log(`----------------------------------------`);
    trades?.forEach(t => {
        console.log(`${t.close_time} | Ticket: ${t.ticket} | Profit: ${t.profit_loss} | Type: ${t.type}`);
    });
    console.log(`----------------------------------------`);
}

checkTrades();
