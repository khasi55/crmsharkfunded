
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEmail() {
    const wrongProfileId = 'ba63810e-55d6-47aa-afc9-ba7ec5b2b7ea'; // sahilsahil19998@gmail.com
    const correctProfileId = '684e0da0-8400-4674-8c85-d5bcd73a2317'; // kaifkhankaif9079@gmail.com
    const correctEmail = 'kaifkhankaif9079@gmail.com';

    console.log('--- Starting Fix Process for Sahil ---');

    // 1. Delete associated data for the empty user (notifications were found in previous check)
    console.log(`Deleting notifications for user: ${correctProfileId}...`);
    const { error: nError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', correctProfileId);

    if (nError) {
        console.error('Error deleting notifications:', nError);
        // We continue anyway as we want to delete the profile
    }

    // 2. Delete the empty profile
    console.log(`Deleting empty profile: ${correctProfileId}...`);
    const { error: dError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', correctProfileId);

    if (dError) {
        console.error('Error deleting profile:', dError);
        return;
    }
    console.log('Empty profile deleted successfully.');

    // 3. Update the active profile email
    console.log(`Updating email for active profile: ${wrongProfileId} to ${correctEmail}...`);
    const { error: uError } = await supabase
        .from('profiles')
        .update({ email: correctEmail, full_name: 'Mohd Kaif' })
        .eq('id', wrongProfileId);

    if (uError) {
        console.error('Error updating email:', uError);
        return;
    }
    console.log('Email and Name updated successfully.');

    console.log('--- Fix Process Completed ---');
}

fixEmail();
