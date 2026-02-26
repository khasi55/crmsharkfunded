import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'princevaghela9007@gmail.com';
    console.log(`Verifying User: ${email}`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("List Error:", listError);
        return;
    }

    let user = users?.find(u => u.email === email);

    if (!user) {
        console.warn("User not found in auth.users. Checking profiles table...");
        const { data: profile } = await supabase.from('profiles').select('*').eq('email', email).single();
        if (profile) {
            console.log("✅ Found profile, but no auth user found for this email.");
            console.log("   - Profile ID:", profile.id);
            console.log("   - Full Name:", profile.full_name);
        } else {
            console.error("❌ User not found in auth.users OR profiles table.");
        }
        return;
    }

    console.log(`✅ Found Auth User ID: ${user.id}`);

    if (user.email_confirmed_at) {
        console.log("Email is already verified.");
        return;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (error) {
        console.error("Verification Error:", error.message);
    } else {
        console.log("✅ Email successfully verified!");
        console.log("   - Confirmed At:", data.user.email_confirmed_at);
    }
}

main();
