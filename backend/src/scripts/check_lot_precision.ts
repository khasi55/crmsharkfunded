
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
    console.log('🔍 Querying Postgres for "trades" column types...\n');

    const { data: cols, error } = await supabase.rpc('get_table_info', { table_name: 'trades' });

    // If get_table_info doesn't exist, we'll try a different approach via the generic 'rpc' or just a select on information_schema if enabled
    // Since we don't know the RPC names, let's use a trick: query the Postgres information_schema via a view or just check types from a JSON-like perspective.

    // Actually, let's use the .select() on a known system view if possible, though Supabase often restricts this.
    // Instead, let's just check if a decimal lot size can be inserted.

    console.log("Testing decimal insertion into lots...");
    const testId = '00000000-0000-0000-0000-000000000000'; // Dummy ID if we need one, but let's try an UPDATE on an existing zero lot.

    const { data: zeroTrade } = await supabase.from('trades').select('id, ticket').eq('lots', 0).limit(1).single();

    if (zeroTrade) {
        console.log(`Found trade with 0 lots: ${zeroTrade.ticket}. Trying to set it to 0.12...`);
        const { error: updateError } = await supabase.from('trades').update({ lots: 0.12 }).eq('id', zeroTrade.id).select();

        if (updateError) {
            console.error("❌ Update failed:", updateError.message);
        } else {
            const { data: verified } = await supabase.from('trades').select('lots').eq('id', zeroTrade.id).single();
            console.log(`✅ Update succeeded. Value in DB: ${verified?.lots}`);
            if (verified?.lots === 0) {
                console.log("⚠️  Value was truncated to 0. The column is likely an INTEGER.");
            } else if (verified?.lots === 0.12) {
                console.log("💎 Value maintained precision. The column supports decimals.");
            } else {
                console.log(`❓ Unexpected value: ${verified?.lots}`);
            }

            // Revert the change
            await supabase.from('trades').update({ lots: 0 }).eq('id', zeroTrade.id);
        }
    } else {
        console.log("No trades with 0 lots found to test.");
    }
}

checkSchema();
