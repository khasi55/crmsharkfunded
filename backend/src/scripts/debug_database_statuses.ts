import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    console.log("🔍 Fetching unique statuses from challenges table...");
    const { data, error } = await supabase
        .from('challenges')
        .select('status');

    if (error) {
        console.error("❌ Error fetching statuses:", error);
        return;
    }

    const statuses = new Set(data.map(item => item.status));
    console.log("✅ Unique statuses found:", Array.from(statuses));

    // Also check the specific account the user mentioned
    const { data: specificAccount, error: accError } = await supabase
        .from('challenges')
        .select('id, login, status, upgraded_to')
        .eq('login', 900909490652)
        .single();

    if (accError) {
        console.error("❌ Error fetching specific account:", accError);
    } else {
        console.log("📊 Specific Account State:", specificAccount);
    }
}

checkStatuses();
