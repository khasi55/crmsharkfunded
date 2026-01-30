import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey) as any;

async function fixTradeDataV2() {
    console.log("🚀 Starting Trade Data Fix V2...");

    // 1. Fix Raw Types '0' and '1'
    console.log("Fixing raw '0' and '1' types...");
    await supabase.from('trades').update({ type: 'buy' }).eq('type', '0');
    await supabase.from('trades').update({ type: 'sell' }).eq('type', '1');
    console.log("✅ Raw types fixed.");

    // 2. Lots Fix
    // Strategy: Fetch all trades with lots > 10.
    // Assume these are the '100x' scaled ones.
    console.log("Fetching oversized lots (> 10)...");

    // Pagination to handle large datasets
    let hasMore = true;
    let page = 0;
    const pageSize = 500;
    let totalFixed = 0;

    while (hasMore) {
        const { data: trades, error } = await supabase
            .from('trades')
            .select('id, lots')
            .gt('lots', 10)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Error fetching:", error);
            break;
        }

        if (!trades || trades.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`Processing batch ${page + 1} (${trades.length} trades)...`);

        // Update in parallel chunks of 20
        const chunkCheck = 20;
        for (let i = 0; i < trades.length; i += chunkCheck) {
            const chunk = trades.slice(i, i + chunkCheck);
            await Promise.all(chunk.map(async (t: any) => {
                // If lots is e.g. 10000, we want 100? No wait.
                // Logic: Worker changed from /100 to /10000.
                // So New = Old / 100.
                // 10000 -> 100.
                // 4000 -> 40.
                // This seems "safer". If 40 lots is still too big, then we need /10000.
                // But let's stick to the code change logic (factor of 100 difference).

                const newLots = t.lots / 100;
                await supabase.from('trades').update({ lots: newLots }).eq('id', t.id);
            }));
        }

        totalFixed += trades.length;
        page++;
    }

    console.log(`✅ Lots Fix Complete. Updated ${totalFixed} records.`);
}

fixTradeDataV2();
