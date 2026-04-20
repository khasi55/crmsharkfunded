
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend directory
dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/backend/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
    const email = 'syedazhar1997@gmail.com';

    console.log(`Checking user info for: ${email}...`);
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (pError) {
        console.error('Error fetching profile:', pError);
        return;
    } 
    
    if (!profile) {
        console.log('No profile found with this email.');
        return;
    }

    console.log('Profile found:', JSON.stringify(profile, null, 2));

    console.log(`Checking bank details for user_id: ${profile.id}...`);
    const { data: bankDetails, error: bError } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

    if (bError) {
        console.error('Error fetching bank details:', bError);
    } else if (bankDetails) {
        console.log('Bank details found:', JSON.stringify(bankDetails, null, 2));
    } else {
        console.log('No bank details found for this user.');
    }
}

findUser();
