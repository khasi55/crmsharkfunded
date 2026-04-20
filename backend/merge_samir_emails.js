
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

async function mergeSamirEmails() {
    const emptyUserId = '3259d178-1e40-4c9f-a65e-8dae10c61f2a'; // samirhansda2007@gmail.com
    const activeUserId = '9b45ba89-0f11-4b1a-b5fd-810ebd941c23'; // samirhansda6219@gmail.com
    const correctEmail = 'samirhansda2007@gmail.com';

    console.log('--- Starting Merge Process for Samir Hansda ---');

    // 1. Delete associated data for the empty user (if any)
    console.log(`Deleting notifications for user: ${emptyUserId}...`);
    const { error: nError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', emptyUserId);

    if (nError) {
        console.error('Error deleting notifications:', nError);
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

mergeSamirEmails();
