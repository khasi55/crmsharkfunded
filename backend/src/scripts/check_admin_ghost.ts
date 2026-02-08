
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAdminUser() {
    const ghostId = 'e90055f2-5f5d-41c2-9f40-f5146a5d730d';
    console.log(`🕵️ Checking IF Ghost ID ${ghostId} is an Admin User...`);

    const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', ghostId)
        .maybeSingle();

    if (adminUser) {
        console.log("🚨 FOUND IN ADMIN_USERS!");
        console.log(adminUser);
        console.log("This explains why it works without Auth Header - it uses 'admin_session' cookie!");
    } else {
        console.log("❌ Not found in admin_users.");
    }
}

checkAdminUser();
