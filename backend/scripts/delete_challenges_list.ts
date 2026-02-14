
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const partialIds = [
    '378ad919',
    '916e9773',
    'd63586f7',
    '124cd498',
    '15bacf39',
    'a4f6c5bf',
    '150f609f',
    '1ee704d0',
    '03bc509a',
    '7d45bd1c',
    '20e36494',
    'df6778f7'
];

async function main() {
    console.log(`🚀 Starting deletion for ${partialIds.length} challenges...`);

    for (const partialId of partialIds) {
        // Find full challenge
        // Using 'like' with UUID wildcard is standard in postgres: cast to text
        // Supabase JS doesn't support casting in column name for filter directly usually, but let's try .text() or just fetch all and filter in JS if needed.
        // Actually, simple way is to use .or() with full UUID if we had it.
        // But here we have partial.
        // Let's try to search by casting.
        const { data: challenges, error: findError } = await supabase
            .from('challenges')
            .select('id, login')
            // This syntax is trickier in supabase-js. It usually requires .textSearch or rpc.
            // Let's fetch ranges or use a raw hack if possible, OR just fetch all and filter which is safer for small batches.
            // Given we have 12 specific IDs.
            // Wait, supabase supports .ilike but only on text columns. ID is UUID.
            // Workaround: Use a known range or fetch by another field? No.
            // Best way for script: Fetch recently created challenges and filter in JS.
            .order('created_at', { ascending: false })
            .limit(100);

        // Filter in JS
        const match = challenges?.find(c => c.id.startsWith(partialId));

        if (findError) {
            console.error(`❌ Error searching for partial ID ${partialId}:`, findError.message);
            continue;
        }

        if (!match) {
            console.warn(`⚠️ No challenge found matching start: ${partialId}`);
            continue;
        }

        const challenge = match;
        console.log(`\n🎯 Found Challenge: ${challenge.id} (Login: ${challenge.login})`);

        // 1. Delete Payment Orders linked to this challenge
        const { error: payError } = await supabase
            .from('payment_orders')
            .delete()
            .eq('challenge_id', challenge.id);

        if (payError) console.error(`   ❌ Failed to delete payment_orders: ${payError.message}`);
        else console.log(`   ✅ Deleted associated payment_orders`);

        // 2. Delete Trades
        const { error: tradeError } = await supabase
            .from('trades')
            .delete()
            .eq('challenge_id', challenge.id);

        if (tradeError) console.error(`   ❌ Failed to delete trades: ${tradeError.message}`);
        else console.log(`   ✅ Deleted associated trades`);

        // 3. Delete Competition Participants
        const { error: compError } = await supabase
            .from('competition_participants')
            .delete()
            .eq('challenge_id', challenge.id);

        if (compError) console.error(`   ❌ Failed to delete competition_participants: ${compError.message}`);
        else console.log(`   ✅ Deleted associated competition_participants`);

        // 4. Delete Challenge
        const { error: delError } = await supabase
            .from('challenges')
            .delete()
            .eq('id', challenge.id);

        if (delError) {
            console.error(`   ❌ Failed to delete challenge ${challenge.id}: ${delError.message}`);
        } else {
            console.log(`   🎉 Successfully deleted challenge ${challenge.id}`);
        }
    }

    console.log('\n🏁 Deletion process completed.');
}

main().catch(console.error);
