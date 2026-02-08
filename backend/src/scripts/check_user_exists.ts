
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkUser() {
    const userId = 'e90055f2-5f5d-41c2-9f40-f5146a5d730d';
    console.log(`Checking if user ${userId} exists in 'users' table...`);

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error("❌ Error fetching user:", error);
    } else if (data) {
        console.log("✅ User found in 'users' table:", data);
    } else {
        console.log("❌ User NOT found in 'users' table.");
        // Check if we can create it?
        // Check auth.users? (Can't directly via standard client usually without special config)
    }
}

checkUser();
