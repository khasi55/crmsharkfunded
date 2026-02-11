
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

async function searchBucketsAndUsers() {
    console.log("🔍 Starting deep search...");

    // 1. List Buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error("❌ Error listing buckets:", bucketError.message);
    } else {
        console.log("\n📦 Available Buckets:");
        buckets.forEach(b => console.log(` - ${b.name}`));
    }

    // 2. Fuzzy Search User
    const searchTerm = 'novembermoon';
    console.log(`\n🔍 Searching for users like '%${searchTerm}%'...`);

    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${searchTerm}%`);

    if (userError) {
        console.error("❌ Error searching users:", userError.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found.");
    } else {
        console.log(`Found ${users.length} user(s):`);
        users.forEach(u => console.log(` - ${u.email} (${u.id})`));
    }
}

searchBucketsAndUsers();
