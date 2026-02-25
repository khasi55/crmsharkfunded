
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixLotsResilient() {
    console.log('🔧 Starting RESILIENT lot size fix...\n');

    try {
        const { count, error: countError } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .gt('lots', 10);

        if (countError) {
            console.error('❌ Error counting trades:', countError.message);
            return;
        }

        console.log(`📊 Total trades needing fix: ${count}`);
        if (!count || count === 0) {
            console.log('✅ No trades need fixing!');
            return;
        }

        let totalUpdated = 0;
        const fetchSize = 1000;
        const parallelLimit = 5;

        while (true) {
            const { data: trades, error: fetchError } = await supabase
                .from('trades')
                .select('id, lots, ticket')
                .gt('lots', 10)
                .limit(fetchSize);

            if (fetchError) {
                console.error('❌ Error fetching trades:', fetchError.message);
                break;
            }

            if (!trades || trades.length === 0) {
                console.log('\n✅ All trades processed!');
                break;
            }

            console.log(`\n🔄 Processing batch of ${trades.length} trades (Concurrency: ${parallelLimit})...`);

            for (let i = 0; i < trades.length; i += parallelLimit) {
                const chunk = trades.slice(i, i + parallelLimit);
                await Promise.all(chunk.map(async (t) => {
                    let retries = 3;
                    while (retries > 0) {
                        try {
                            const { error: updateError } = await supabase
                                .from('trades')
                                .update({ lots: t.lots / 100 })
                                .eq('id', t.id);

                            if (updateError) {
                                console.error(`   ❌ Error updating ticket ${t.ticket}:`, updateError.message);
                                retries--;
                                await delay(1000);
                            } else {
                                break;
                            }
                        } catch (e: any) {
                            console.error(`   ❌ Exception updating ticket ${t.ticket}:`, e.message);
                            retries--;
                            await delay(1000);
                        }
                    }
                }));
                totalUpdated += chunk.length;
                if (totalUpdated % 100 === 0) {
                    console.log(`   Progress: ${totalUpdated}/${count} trades updated...`);
                }
            }
        }

        console.log(`\n📊 Final Summary:`);
        console.log(`   ✅ Successfully fixed: ${totalUpdated} trades`);

    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

fixLotsResilient();
