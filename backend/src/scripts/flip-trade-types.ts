import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function flipTradeTypes() {
    console.log('🔧 Starting Buy/Sell type flip...\n');

    try {
        // Fetch ALL trades that are either 'buy' or 'sell'
        const { data: trades, error: fetchError } = await supabase
            .from('trades')
            .select('id, ticket, type, symbol')
            .in('type', ['buy', 'sell']);

        if (fetchError) {
            console.error('❌ Error fetching trades:', fetchError);
            return;
        }

        if (!trades || trades.length === 0) {
            console.log('✅ No trades to flip!');
            return;
        }

        console.log(`📊 Total trades needing flip: ${trades.length}\n`);

        let totalUpdated = 0;
        let totalFailed = 0;

        for (const trade of trades) {
            const newType = trade.type === 'buy' ? 'sell' : 'buy';

            const { error: updateError } = await supabase
                .from('trades')
                .update({ type: newType })
                .eq('id', trade.id);

            if (updateError) {
                console.error(`   ❌ Error flipping trade ${trade.ticket}:`, updateError.message);
                totalFailed++;
            } else {
                totalUpdated++;
                if (totalUpdated % 100 === 0) {
                    console.log(`   Progress: ${totalUpdated}/${trades.length} trades flipped...`);
                }
            }
        }

        console.log(`\n📊 Final Summary:`);
        console.log(`   ✅ Successfully flipped: ${totalUpdated} trades`);
        if (totalFailed > 0) {
            console.log(`   ⚠️  Failed to update: ${totalFailed} trades`);
        }

    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

flipTradeTypes()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
