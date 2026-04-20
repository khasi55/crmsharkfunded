
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function countUnsynced() {
    console.log("Checking migration status...");
    const { count, error } = await supabase
        .from('userslist')
        .select('*', { count: 'exact', head: true })
        .is('synced_at', null);

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log(`📊 Unsynced users remaining: ${count}`);
    }
}

countUnsynced();
