
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAuthUser() {
    const userId = 'e90055f2-5f5d-41c2-9f40-f5146a5d730d';
    console.log(`🕵️ Checking Auth User ID: ${userId} on ${supabaseUrl}...`);

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
        console.error("❌ Error fetching auth user:", error);
    } else if (data && data.user) {
        console.log("✅ User FOUND in 'auth.users':");
        console.log(`   ID: ${data.user.id}`);
        console.log(`   Email: ${data.user.email}`);
        console.log(`   Created: ${data.user.created_at}`);
    } else {
        console.log("❌ User NOT found in 'auth.users'. (Token might be stale)");
    }
}

checkAuthUser();
