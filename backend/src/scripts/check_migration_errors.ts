
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkErrors() {
    console.log("Checking migration errors...");
    const { data, error } = await supabase
        .from('userslist')
        .select('migration_error')
        .is('synced_at', null);

    if (error) {
        console.error("❌ Error:", error);
        return;
    }

    const errorCounts: Record<string, number> = {};
    data?.forEach(row => {
        const err = row.migration_error || 'No error yet';
        errorCounts[err] = (errorCounts[err] || 0) + 1;
    });

    console.log("📊 Migration Error Summary:");
    console.table(errorCounts);
}

checkErrors();
