import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAndVerifyEmail() {
    const targetEmail = 'saquibmohammad890@gmail.com';
    const profileId = '084a96bb-5f3d-4e2c-bd49-f98e681fef42';

    console.log(`🔍 Processing verification for: ${targetEmail} (ID: ${profileId})`);

    // 1. Check current auth state
    const { data: { user: authUser }, error: fetchErr } = await supabase.auth.admin.getUserById(profileId);

    if (fetchErr || !authUser) {
        console.error("❌ Auth user not found:", fetchErr?.message || "No user returned");
        return;
    }

    console.log(`Current Auth Email: ${authUser.email}`);
    console.log(`Current Confirmation Status: ${!!authUser.email_confirmed_at}`);

    // 2. Update and Confirm
    console.log(`Updating auth email to ${targetEmail} and confirming...`);
    const { data: updatedUser, error: updateErr } = await supabase.auth.admin.updateUserById(
        profileId,
        {
            email: targetEmail,
            email_confirm: true
        }
    );

    if (updateErr) {
        console.error("❌ Failed to update/verify email:", updateErr.message);
    } else {
        console.log(`✅ SUCCESSFULLY UPDATED AND VERIFIED:`);
        console.log(`Email: ${updatedUser.user.email}`);
        console.log(`Confirmed At: ${updatedUser.user.confirmed_at}`);
    }
}

syncAndVerifyEmail();
