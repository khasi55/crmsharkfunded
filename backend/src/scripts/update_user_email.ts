import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEmail() {
    const userId = 'ea290566-c2ce-47ca-8cfa-851d30d3df38';
    const oldEmail = 'salmankhan788812@gmali.com';
    const newEmail = 'salmankhan788812@gmail.com';

    console.log(`Starting update for user ID: ${userId}`);
    console.log(`Typo email: ${oldEmail}`);
    console.log(`Correct email: ${newEmail}`);

    // 1. Update Supabase Auth
    console.log("Updating Supabase Auth...");
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true // Ensure it's confirmed to avoid verification loops
    });

    if (authError) {
        console.error("Error updating Auth:", authError.message);
        // We might want to stop here if Auth update fails
    } else {
        console.log("Successfully updated Auth email.");
    }

    // 2. Update Profiles table
    console.log("Updating 'profiles' table...");
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', userId);

    if (profileError) {
        console.error("Error updating profiles table:", profileError.message);
    } else {
        console.log("Successfully updated 'profiles' table.");
    }

    // 3. Optional: Search and update any other likely tables if they use email as a flat field
    // For now, these were the confirmed ones.
}

updateEmail();
