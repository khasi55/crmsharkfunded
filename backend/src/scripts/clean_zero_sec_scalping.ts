
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanZeroSecScalping(dryRun = true) {
    console.log(`🔍 Checking for 0-second tick scalping violations... (${dryRun ? 'DRY RUN' : 'LIVE MODE'})`);

    // We search for tick_scalping where description contains "Duration 0s"
    const { data: violations, error } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('flag_type', 'tick_scalping')
        .like('description', '%Duration 0s%');

    if (error) {
        console.error("❌ Error fetching violations:", error);
        return;
    }

    if (!violations || violations.length === 0) {
        console.log("✅ No 0-second tick scalping violations found.");
        return;
    }

    console.log(`📊 Found ${violations.length} violations with 0-second duration.`);

    if (dryRun) {
        console.log("ℹ️ Dry run: No records were deleted.");
        // console.log(violations.map(v => ({ id: v.id, ticket: v.trade_ticket, desc: v.description })));
    } else {
        const ids = violations.map(v => v.id);
        const BATCH_SIZE = 100;
        let deletedCount = 0;

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);
            const { error: deleteError } = await supabase
                .from('advanced_risk_flags')
                .delete()
                .in('id', batch);

            if (deleteError) {
                console.error(`❌ Error deleting batch ${i / BATCH_SIZE + 1}:`, deleteError);
            } else {
                deletedCount += batch.length;
                console.log(`✅ Deleted batch ${i / BATCH_SIZE + 1} (${batch.length} records)`);
            }
        }
        console.log(`🎉 Successfully deleted a total of ${deletedCount} violations.`);
    }
}

// Default to dry-run unless --confirm is passed
const isLive = process.argv.includes('--confirm');
cleanZeroSecScalping(!isLive).catch(console.error);
