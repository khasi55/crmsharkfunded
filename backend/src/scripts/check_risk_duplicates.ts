
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log("Checking advanced_risk_flags data structure...");

    // Check constraints via information_schema manually? No, simpler to check if duplicate rows exist or try insert
    // But inserting could leave junk.
    // Let's just SELECT a violation and see if we can find duplicates already.

    const { data: duplicates } = await supabase.rpc('exec_sql', {
        sql: `
            SELECT challenge_id, trade_ticket, flag_type, COUNT(*)
            FROM advanced_risk_flags
            GROUP BY challenge_id, trade_ticket, flag_type
            HAVING COUNT(*) > 1
            LIMIT 5;
        `
    });

    // If exec_sql fails, we fallback to selecting recent ones

    if (!duplicates) {
        console.log("Cannot run raw SQL for duplicates check. Fetching recent flags...");
        const { data } = await supabase.from('advanced_risk_flags').select('*').order('created_at', { ascending: false }).limit(20);
        console.table(data);
    } else {
        console.log("Duplicates found via SQL:");
        console.table(duplicates);
    }
}

check();
