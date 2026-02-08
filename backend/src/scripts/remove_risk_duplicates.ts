
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function cleanupDuplicates() {
    console.log("🧹 Starting cleanup of duplicate risk flags...");

    // SQL to keep only the FIRST violation for each (challenge, ticket, type) tuple
    const sql = `
        DELETE FROM advanced_risk_flags
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY challenge_id, trade_ticket, flag_type
                           ORDER BY created_at ASC
                       ) as row_num
                FROM advanced_risk_flags
            ) t
            WHERE t.row_num > 1
        );
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error("❌ SQL Execution Failed:", error);
        console.log("⚠️ Fallback: Trying manual JS deduplication (slower)...");
        await manualCleanup();
    } else {
        console.log("✅ SQL Cleanup Successful! Duplicates removed.");
    }
}

async function manualCleanup() {
    // 1. Fetch all flags (Warning: minimal fetch if many rows)
    const { data: flags, error } = await supabase
        .from('advanced_risk_flags')
        .select('*'); // Should limit fields if possible

    if (error || !flags) {
        console.error("Failed to fetch flags:", error);
        return;
    }

    console.log(`Fetched ${flags.length} total flags. analyzing...`);

    const seen = new Set();
    const toDelete: string[] = [];

    // Sort by created_at ASC so we keep the first one
    flags.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const flag of flags) {
        const key = `${flag.challenge_id}-${flag.trade_ticket}-${flag.flag_type}`;
        if (seen.has(key)) {
            toDelete.push(flag.id);
        } else {
            seen.add(key);
        }
    }

    console.log(`Found ${toDelete.length} duplicates to delete.`);

    if (toDelete.length > 0) {
        // Delete in batches
        for (let i = 0; i < toDelete.length; i += 50) {
            const batch = toDelete.slice(i, i + 50);
            const { error: delError } = await supabase
                .from('advanced_risk_flags')
                .delete()
                .in('id', batch);

            if (delError) console.error("Error deleting batch:", delError);
            else console.log(`Deleted batch ${i}-${i + 50}`);
        }
    }
    console.log("✅ Manual Cleanup Done.");
}

cleanupDuplicates();
