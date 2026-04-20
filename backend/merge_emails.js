
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeEmails() {
    const emptyUserId = '6ad33fbc-02bf-419c-b01b-6d3a19cdfe89'; // somashekharpaled01@gmail.com
    const activeUserId = '822bae4d-6fbc-4b0a-a17d-a346aa7e0e10'; // somshekharpaled01@gmail.com
    const correctEmail = 'somashekharpaled01@gmail.com';

    console.log('--- Starting Merge Process ---');

    // 1. Delete associated data for the empty user (notifications were found)
    console.log(`Deleting notifications for user: ${emptyUserId}...`);
    const { error: nError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', emptyUserId);

    if (nError) {
        console.error('Error deleting notifications:', nError);
        // We continue anyway as profiles deletion usually handles cascades or we can handle it
    }

    // 2. Delete the empty profile
    console.log(`Deleting empty profile: ${emptyUserId}...`);
    const { error: dError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', emptyUserId);

    if (dError) {
        console.error('Error deleting profile:', dError);
        return;
    }
    console.log('Empty profile deleted successfully.');

    // 3. Update the active profile email
    console.log(`Updating email for active profile: ${activeUserId} to ${correctEmail}...`);
    const { error: uError } = await supabase
        .from('profiles')
        .update({ email: correctEmail })
        .eq('id', activeUserId);

    if (uError) {
        console.error('Error updating email:', uError);
        return;
    }
    console.log('Email updated successfully.');

    console.log('--- Merge Process Completed ---');
}

mergeEmails();
