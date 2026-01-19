
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncEquity() {
    const LOGIN = 889224326;
    console.log(`Syncing Equity for account ${LOGIN}...`);

    // 1. Get Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    // 2. Get Trades
    const { data: trades, error: tError } = await supabase
        .from('trades')
        .select('profit_loss, swap, commission')
        .eq('challenge_id', challenge.id);

    if (tError) {
        console.error('Error fetching trades:', tError);
        return;
    }

    // 3. Calculate PnL
    let totalPnL = 0;
    trades.forEach(t => {
        totalPnL += (Number(t.profit_loss) + Number(t.swap) + Number(t.commission));
    });

    const initialBalance = Number(challenge.initial_balance);
    const calculatedEquity = initialBalance + totalPnL;

    console.log(`Initial Balance: ${initialBalance}`);
    console.log(`Total PnL from ${trades.length} trades: ${totalPnL}`);
    console.log(`Calculated Equity: ${calculatedEquity}`);
    console.log(`Current DB Equity: ${challenge.current_equity}`);

    // 4. Update Challenge
    if (calculatedEquity !== Number(challenge.current_equity)) {
        const { error: uError } = await supabase
            .from('challenges')
            .update({
                current_equity: calculatedEquity,
                current_balance: calculatedEquity // Assuming all trades closed?
            })
            .eq('id', challenge.id);

        if (uError) {
            console.error('Error updating challenge:', uError);
        } else {
            console.log('✅ Successfully updated challenge equity!');
        }
    } else {
        console.log('✅ Equity is already correct.');
    }
}

syncEquity();
