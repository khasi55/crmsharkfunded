
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = 'nangkiew67@gmail.com';
    console.log(`🔍 Checking user: ${email}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

    if (profile) {
        console.log('✅ Profile found:', profile);
    } else {
        console.log('❌ Profile not found.');

        console.log("Searching in auth.users...");
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const authUser = users.find(u => u.email === email);
        if (authUser) {
            console.log('✅ Auth user found:', authUser.id);
        } else {
            console.log('❌ Auth user not found.');
        }
    }
}

checkUser();
