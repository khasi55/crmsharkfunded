import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEmail() {
    const oldEmail = 'kunnthuwealth3004@gmail.com';
    const newEmail = 'Kunthuwealth3004@gmail.com';

    console.log(`Searching for user with email: ${oldEmail}`);

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', oldEmail)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError.message);
        return;
    }

    if (!profile) {
        console.log("No profile found with the old email.");

        // Maybe the email is already Kunthuwealth? Let's check
        const { data: profile2 } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', newEmail)
            .single();

        if (profile2) {
            console.log(`User already exists with email ${newEmail} (ID: ${profile2.id})`);
        }
        return;
    }

    const userId = profile.id;
    console.log(`Found user ID: ${userId}`);

    console.log(`Updating auth user email...`);
    // Note: updating Auth requires admin rights which the service key has
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: newEmail, email_confirm: true }
    );

    if (authError) {
        console.error("Failed to update auth email:", authError.message);
    } else {
        console.log("Successfully updated auth user email.");
    }

    console.log(`Updating profiles email...`);
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', userId);

    if (updateError) {
        console.error("Failed to update profile email:", updateError.message);
    } else {
        console.log("Successfully updated profile email.");
    }

    console.log("Done.");
}

updateEmail();
