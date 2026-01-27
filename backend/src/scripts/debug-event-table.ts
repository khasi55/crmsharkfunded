
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log("🔍 Checking 'event_entry_passes' table...");

    // Try to insert a dummy record
    const dummyCode = 'TEST-' + Math.random().toString(36).substring(7);

    const { data, error } = await supabase
        .from('event_entry_passes')
        .insert({
            code: dummyCode,
            event_slug: 'test-event',
            attendee_name: 'Debug User',
            attendee_email: 'debug@example.com'
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Error accessing table:", error.message);
        if (error.code === '42P01') { // undefined_table
            console.error("💡 The table 'event_entry_passes' likely does not exist.");
            console.error("👉 Please run the SQL migration provided earlier.");
        }
    } else {
        console.log("✅ Table exists and insert worked.");
        console.log("Created pass:", data);

        // Clean up
        await supabase.from('event_entry_passes').delete().eq('id', data.id);
        console.log("Cleaned up test record.");
    }
}

checkTable();
