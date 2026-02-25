
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'adityasingh.feb10@gmail.com';
    console.log(`Checking User: ${email}`);

    // 1. Check Auth User
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("Auth List Error:", authError);
    }

    const authUser = users?.find(u => u.email === email);

    if (authUser) {
        console.log(`✅ Auth User Found: ${authUser.id}`);
        console.log(`   - Email Verified: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   - Created: ${authUser.created_at}`);
        console.log(`   - Last Sign In: ${authUser.last_sign_in_at}`);

        if (!authUser.email_confirmed_at) {
            console.log("⚠️ Email is NOT confirmed in Auth.");
        }
    } else {
        console.log(`❌ Auth User NOT found.`);
    }

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (profile) {
        console.log(`✅ Profile Found: ${profile.id}`);
        console.log(`   - Name: ${profile.full_name}`);
        console.log(`   - Role: ${profile.role}`);
        console.log(`   - Email: ${profile.email}`);
    } else {
        console.log(`❌ Profile NOT found.`);
        if (profileError) console.log(`   Error: ${profileError.message}`);
    }

    // 3. Check Challenges/Accounts
    const { data: accounts } = await supabase
        .from('challenges')
        .select('id, login, status, plan_id')
        .eq('user_id', authUser?.id || (profile?.id));

    if (accounts && accounts.length > 0) {
        console.log(`✅ Accounts Found (${accounts.length}):`);
        accounts.forEach(acc => {
            console.log(`   - Login: ${acc.login}, Plan: ${acc.plan_id}, Status: ${acc.status}`);
        });
    } else {
        console.log(`❌ No accounts found for this user.`);
    }
}

main();
