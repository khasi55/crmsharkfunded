
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

async function setUserPassword() {
    const email = 'vikashkumarr482@gmail.com';
    const password = 'Arti@#$_';

    console.log(`🔍 Looking for user: ${email}...`);

    // 1. Find the user ID from profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profile) {
        console.log(`✅ User found in profiles (${profile.id}). Updating password...`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
            password: password
        });

        if (updateError) {
            console.error("❌ Failed to update password:", updateError.message);
        } else {
            console.log("🎉 Password updated successfully!");
        }
    } else {
        console.log("⚠️ User not found in profiles table.");

        // Fallback: Try to list users again with a larger limit or search if possible
        // But if they are registered, they should be in profiles if the system is working correctly.
        // If not, we might need to create them? But the previous error said "already registered".

        console.log("Attempting to find in auth.users via listUsers...");
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

        if (listError) {
            console.error("❌ Error listing users:", listError.message);
            return;
        }

        const authUser = users.find(u => u.email === email);
        if (authUser) {
            console.log(`✅ User found in auth.users (${authUser.id}). Updating password...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
                password: password
            });

            if (updateError) {
                console.error("❌ Failed to update password:", updateError.message);
            } else {
                console.log("🎉 Password updated successfully!");
            }
        } else {
            console.log("❌ User existing in auth but not found in list? This is strange.");
        }
    }
}

setUserPassword();
