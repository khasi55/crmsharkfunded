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

async function fixAllLotSizes() {
    console.log('🔧 Starting COMPLETE lot size fix...\n');

    try {
        // First, count how many trades need fixing
        const { count, error: countError } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .gt('lots', 10);

        if (countError) {
            console.error('❌ Error counting trades:', countError);
            return;
        }

        console.log(`📊 Total trades needing fix: ${count}\n`);

        if (!count || count === 0) {
            console.log('✅ No trades need fixing!');
            return;
        }

        let totalUpdated = 0;
        let totalFailed = 0;
        const batchSize = 1000;

        // Process in batches until no more trades need fixing
        while (true) {
            // Fetch next batch
            const { data: trades, error: fetchError } = await supabase
                .from('trades')
                .select('id, ticket, lots, symbol')
                .gt('lots', 10)
                .limit(batchSize);

            if (fetchError) {
                console.error('❌ Error fetching trades:', fetchError);
                break;
            }

            if (!trades || trades.length === 0) {
                console.log('\n✅ All trades processed!');
                break;
            }

            console.log(`\n🔄 Processing batch of ${trades.length} trades...`);
            console.log(`   Sample: Ticket ${trades[0].ticket}, Lots: ${trades[0].lots} → ${trades[0].lots / 100}`);

            // Update each trade in this batch
            for (const trade of trades) {
                const newLots = trade.lots / 100;

                const { error: updateError } = await supabase
                    .from('trades')
                    .update({ lots: newLots })
                    .eq('id', trade.id);

                if (updateError) {
                    console.error(`   ❌ Error updating trade ${trade.ticket}:`, updateError.message);
                    totalFailed++;
                } else {
                    totalUpdated++;
                    if (totalUpdated % 100 === 0) {
                        console.log(`   Progress: ${totalUpdated} trades updated...`);
                    }
                }
            }

            console.log(`   ✅ Batch complete: ${trades.length} trades processed`);
        }

        console.log(`\n📊 Final Summary:`);
        console.log(`   ✅ Successfully fixed: ${totalUpdated} trades`);
        if (totalFailed > 0) {
            console.log(`   ⚠️  Failed to update: ${totalFailed} trades`);
        }

        // Verify no trades remain
        const { count: remainingCount } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .gt('lots', 10);

        console.log(`\n🔍 Verification: ${remainingCount || 0} trades still need fixing`);

    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

fixAllLotSizes()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
