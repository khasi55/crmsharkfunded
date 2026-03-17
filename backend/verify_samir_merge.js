
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

async function verifySamirMerge() {
    const oldEmail = 'samirhansda6219@gmail.com';
    const newEmail = 'samirhansda2007@gmail.com';
    const expectedUserId = '9b45ba89-0f11-4b1a-b5fd-810ebd941c23';

    console.log('--- Verifying Samir Hansda Merge ---');

    // 1. Check old email
    const { data: oldUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', oldEmail)
        .maybeSingle();

    if (oldUser) {
        console.error(`Verification FAILED: Old email ${oldEmail} still exists!`);
    } else {
        console.log(`Verification PASSED: Old email ${oldEmail} no longer exists.`);
    }

    // 2. Check new email
    const { data: newUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newEmail)
        .maybeSingle();

    if (newUser && newUser.id === expectedUserId) {
        console.log(`Verification PASSED: New email ${newEmail} exists with correct ID ${expectedUserId}.`);
    } else {
        console.error(`Verification FAILED: New email ${newEmail} not found or has wrong ID.`, newUser);
    }

    // 3. Check challenge
    const { count: challengeCount } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', expectedUserId);

    if (challengeCount === 1) {
        console.log(`Verification PASSED: User still has ${challengeCount} challenge.`);
    } else {
        console.error(`Verification FAILED: User has ${challengeCount} challenges (expected 1).`);
    }

    console.log('--- Verification Completed ---');
}

verifySamirMerge();
