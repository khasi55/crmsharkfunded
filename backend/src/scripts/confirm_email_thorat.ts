import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function confirmUserEmail() {
    const email = 'thoratyash222@gmail.com';
    console.log(`🔍 Searching for user with email: ${email}`);

    // 1. Search in profiles
    const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', email)
        .single();

    if (profError) {
        console.error("❌ Profile not found or error:", profError.message);
        // Continue to check auth just in case
    }

    if (profile) {
        console.log(`✅ Profile found: ${profile.full_name} (${profile.id})`);
    }

    // 2. Search in auth.users (admin access)
    // Supabase JS doesn't have listUsersByEmail directly in admin, but we can use listUsers or getUserById if we have the ID.
    // We can also use a raw SQL query if we have a function for it, but let's try searching by ID if we found the profile.
    
    let userId = profile?.id;
    
    if (!userId) {
        console.log("🔍 Profille not found. Searching auth users...");
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error("❌ Error listing users:", listError.message);
            return;
        }
        const user = users.find(u => u.email === email);
        if (user) {
            userId = user.id;
            console.log(`✅ Auth user found directly: ${user.id}`);
        }
    }

    if (!userId) {
        console.log("❌ User not found in system.");
        return;
    }

    console.log(`🚀 Confirming email for user ID: ${userId}...`);

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
    );

    if (updateError) {
        console.error("❌ Error confirming email:", updateError.message);
        return;
    }

    console.log(`✅ Email confirmed successfully for ${email}`);
    if (updatedUser.user.email_confirmed_at) {
        console.log(`   Confirmed at: ${updatedUser.user.email_confirmed_at}`);
    }
}

confirmUserEmail();
