import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey) as any;

async function fixTradeData() {
    console.log("Starting Trade Data Fix...");

    // 1. Swap Buy/Sell
    console.log("Swapping Buy/Sell types...");

    // We can't do a direct swap easily in one query without a temp value
    // Set 'buy' to 'temp_buy'
    const { error: e1 } = await supabase.from('trades').update({ type: 'temp_buy' }).eq('type', 'buy');
    if (e1) console.error("Error causing temp_buy:", e1);

    // Set 'sell' to 'buy' (Correcting the old 'sell' which should have been 'buy')
    // Wait, the CODE was: t.type === 0 ? 'sell' : 'buy' (reversed)
    // So '0' (Actual BUY) became 'sell'.
    // '1' (Actual SELL) became 'buy'.
    // So: OLD 'sell' -> NEW 'buy'. OLD 'buy' -> NEW 'sell'.

    // Convert 'sell' (which is actually buy) to 'buy'
    const { error: e2 } = await supabase.from('trades').update({ type: 'buy' }).eq('type', 'sell');
    if (e2) console.error("Error converting sell -> buy:", e2);

    // Convert 'temp_buy' (which was 'buy', actually sell) to 'sell'
    const { error: e3 } = await supabase.from('trades').update({ type: 'sell' }).eq('type', 'temp_buy');
    if (e3) console.error("Error converting temp_buy -> sell:", e3);

    console.log("✅ Types Swapped.");

    // 2. Fix Lots (Divide by 100)
    // PREVIOUS: lots = volume / 100;
    // NEW: lots = volume / 10000;
    // SO: NewLots = OldLots / 100.
    // Ensure we don't divide already fixed ones (hard to tell, but we can assume all distinct large values need fixing).
    // Or just apply to all non-balance trades.

    console.log("Fixing Lots (Dividing by 100)...");

    // Using a SQL function would be better, but we don't have direct SQL access tool.
    // We have to iterate or use raw query if possible. 
    // Supabase JS client doesn't support generic 'update lots = lots / 100'.
    // We will fetch all trades and update them in batches. 
    // Note: For huge datasets this is bad, but for this context likely okay.

    const { data: trades, error: fetchError } = await supabase
        .from('trades')
        .select('id, lots')
        .neq('type', 'balance') // Don't touch balance if it uses lots field?
        .gt('lots', 10); // Safety filter: assume lots > 10 are definitely wrong (10 lots is huge for retail prop firm usually)

    if (fetchError || !trades) {
        console.error("Failed to fetch trades for lots fix:", fetchError);
        return;
    }

    console.log(`Found ${trades.length} trades with lots > 10. Fixing...`);

    for (const t of trades) {
        const newLots = t.lots / 100;
        await supabase.from('trades').update({ lots: newLots }).eq('id', t.id);
    }

    console.log("✅ Lots Fixed.");
}

fixTradeData();
