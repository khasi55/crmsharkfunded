
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
    const wrongProfileId = '084a96bb-5f3d-4e2c-bd49-f98e681fef42'; // mohammadsakhib890@gmail.com
    const correctProfileId = '7c2e72f0-3002-4f0f-8e94-aa965078818e'; // saquibmohammad890@gmail.com
    const correctEmail = 'saquibmohammad890@gmail.com';

    console.log('--- Starting Fix Process ---');

    // 1. Delete the empty profile
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

    // 2. Update the active profile email
    console.log(`Updating email for active profile: ${wrongProfileId} to ${correctEmail}...`);
    const { error: uError } = await supabase
        .from('profiles')
        .update({ email: correctEmail })
        .eq('id', wrongProfileId);

    if (uError) {
        console.error('Error updating email:', uError);
        return;
    }
    console.log('Email updated successfully.');

    console.log('--- Fix Process Completed ---');
}

fixEmail();
