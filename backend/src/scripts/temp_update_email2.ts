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
    const userId = "35ac13a4-fc0d-4e53-9efe-60474bbc370f"; // ID from previous run
    const newEmail = 'Kunthuwealth3004@gmail.com';

    console.log(`Updating auth user email for ID ${userId}...`);
    // Pass user_metadata as well if needed, or structured differently
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: newEmail, email_confirm: true } as any
    );

    if (authError) {
        console.error("Failed to update auth email:", authError.message);
        console.error("Full error:", JSON.stringify(authError));
    } else {
        console.log("Successfully updated auth user email.");
    }

    console.log("Done.");
}

updateEmail();
