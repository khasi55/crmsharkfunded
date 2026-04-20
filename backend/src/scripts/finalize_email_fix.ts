import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function finalizeUpdate() {
    const typoId = 'ea290566-c2ce-47ca-8cfa-851d30d3df38';
    const correctId = '6f9f4a8a-75c6-40ab-a1dd-2870d81ea43a';
    const finalEmail = 'salmankhan788812@gmail.com';

    console.log("1. Deleting duplicate account (correct email but no data)...");
    
    // Delete profile first
    const { error: delProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', correctId);
    
    if (delProfileError) console.error("Error deleting duplicate profile:", delProfileError.message);
    else console.log("Deleted duplicate profile.");

    // Delete auth user
    const { error: delAuthError } = await supabase.auth.admin.deleteUser(correctId);
    if (delAuthError) console.error("Error deleting duplicate auth user:", delAuthError.message);
    else console.log("Deleted duplicate auth user.");

    console.log("\n2. Updating typo account email to correct email...");

    // Update Auth
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(typoId, {
        email: finalEmail,
        email_confirm: true
    });
    if (updateAuthError) console.error("Error updating Auth email:", updateAuthError.message);
    else console.log("Updated Auth email.");

    // Update Profile
    const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ email: finalEmail })
        .eq('id', typoId);
    
    if (updateProfileError) console.error("Error updating profile email:", updateProfileError.message);
    else console.log("Updated profile email.");
}

finalizeUpdate();
