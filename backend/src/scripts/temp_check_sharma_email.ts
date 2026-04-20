
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmails() {
    const oldEmail = 'sharmarakhisharm895@gmail.com';
    const newEmail = 'sharmarakhisharma895@gmail.com';

    console.log(`--- Checking emails ---`);
    console.log(`Searching for old email: ${oldEmail}`);
    
    // Check profiles
    const { data: oldProfile, error: oldProfileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', oldEmail)
        .maybeSingle();

    if (oldProfile) {
        console.log(`✅ Old email found in profiles: ${oldProfile.full_name} (${oldProfile.id})`);
    } else {
        console.log(`❌ Old email NOT found in profiles.`);
    }

    console.log(`Searching for new email: ${newEmail}`);
    const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', newEmail)
        .maybeSingle();

    if (newProfile) {
        console.log(`⚠️ New email ALREADY exists in profiles: ${newProfile.full_name} (${newProfile.id})`);
    } else {
        console.log(`✅ New email NOT found in profiles (safe to update).`);
    }

    // Check auth.users via RPC if possible, or just note we need to check
    console.log(`Attempting to check auth.users via RPC...`);
    const { data: authUser, error: authError } = await supabase.rpc('execute_sql', {
        sql_query: `SELECT id, email FROM auth.users WHERE email IN ('${oldEmail}', '${newEmail}');`
    });

    if (authError) {
        console.log(`ℹ️ Could not check auth.users directly via RPC: ${authError.message}`);
    } else {
        console.log(`Auth users found:`, authUser);
    }
}

checkEmails();
