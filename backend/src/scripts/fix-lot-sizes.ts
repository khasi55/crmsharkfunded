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

async function fixLotSizes() {
    console.log('🔧 Starting lot size fix...');

    try {
        // Fetch all trades with lots > 10 (these are likely incorrectly stored)
        // Typical lot sizes are 0.01-10.00, so anything above 10 is wrong
        const { data: trades, error: fetchError } = await supabase
            .from('trades')
            .select('id, ticket, lots, symbol')
            .gt('lots', 10);

        if (fetchError) {
            console.error('❌ Error fetching trades:', fetchError);
            return;
        }

        if (!trades || trades.length === 0) {
            console.log('✅ No trades need fixing!');
            return;
        }

        console.log(`📊 Found ${trades.length} trades with incorrect lot sizes`);
        console.log(`   Sample before: Ticket ${trades[0].ticket}, Lots: ${trades[0].lots}`);

        // Fix each trade by dividing lots by 100
        let updated = 0;
        let failed = 0;

        console.log('🔄 Updating trades...');

        for (const trade of trades) {
            const newLots = trade.lots / 100;

            const { error: updateError } = await supabase
                .from('trades')
                .update({ lots: newLots })
                .eq('id', trade.id);

            if (updateError) {
                console.error(`❌ Error updating trade ${trade.ticket}:`, updateError.message);
                failed++;
            } else {
                updated++;
                if (updated % 100 === 0) {
                    console.log(`   Progress: ${updated}/${trades.length} trades updated...`);
                }
            }
        }

        console.log(`\n✅ Successfully fixed ${updated} trades!`);
        if (failed > 0) {
            console.log(`⚠️  Failed to update ${failed} trades`);
        }

        // Verify the fix
        const { data: verifyTrade } = await supabase
            .from('trades')
            .select('ticket, lots')
            .eq('id', trades[0].id)
            .single();

        if (verifyTrade) {
            console.log(`   Sample after: Ticket ${verifyTrade.ticket}, Lots: ${verifyTrade.lots}`);
        }

    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

fixLotSizes()
    .then(() => {
        console.log('✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
