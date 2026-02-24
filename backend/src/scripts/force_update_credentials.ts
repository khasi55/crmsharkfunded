import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const existingUserId = '67be4a1d-e1df-47dc-a69c-58b171eaa182'; // akshitfx18@gmail.com
    const oldUserId = 'e17813c3-3ecf-439c-99b3-99d12b94f0db'; // daxfx2712@gmail.com
    const newEmail = 'akshitfx18@gmail.com';
    const newPassword = 'Dax@00';

    console.log(`1. Deleting existing user (if any) with ID: ${existingUserId}`);
    // First remove from profiles just in case
    const { error: profileDelErr } = await supabase.from('profiles').delete().eq('id', existingUserId);
    if (profileDelErr) {
        console.log(`Profile delete error (might be okay if cascade deletes happen): ${profileDelErr.message}`);
    } else {
        console.log(`Successfully deleted profile ${existingUserId}`);
    }

    const { error: authDelErr } = await supabase.auth.admin.deleteUser(existingUserId);
    if (authDelErr) {
        console.log(`Auth delete error: ${authDelErr.message}`);
    } else {
        console.log(`Successfully deleted auth user ${existingUserId}`);
    }

    console.log(`\n2. Updating target user ID: ${oldUserId}`);
    // Update auth user
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(oldUserId, {
        email: newEmail,
        password: newPassword,
        email_confirm: true
    });

    if (authUpdateError) {
        console.error('Failed to update auth credentials:', authUpdateError);
        return;
    }
    console.log(`Successfully updated auth.users email to ${newEmail} and password.`);

    // Update profile table
    const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', oldUserId);

    if (profileUpdateError) {
        console.error('Failed to update email in profiles table:', profileUpdateError);
        return;
    }

    console.log(`Successfully updated profiles table email to ${newEmail}.`);
    console.log(`Done! Transfer complete.`);
}

main();
