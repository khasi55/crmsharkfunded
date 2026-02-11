
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotificationsSchema() {
    console.log("🔍 Checking 'notifications' table schema...");

    // Attempt to select 'metadata' column
    const { data, error } = await supabase
        .from('notifications')
        .select('id, metadata')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting 'metadata' column:", error.message);
        console.error("   Details:", error);
    } else {
        console.log("✅ 'metadata' column exists and is accessible.");
    }
}

checkNotificationsSchema();
