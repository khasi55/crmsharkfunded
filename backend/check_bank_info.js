
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from same directory
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserBankInfo() {
    const email = 'pushpanjali84090@gmai.com';

    console.log(`Checking user info for: ${email}...`);
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (pError) {
        console.error('Error fetching profile:', pError);
    } else if (profile) {
        console.log('Profile found:', JSON.stringify(profile, null, 2));
    } else {
        console.log('No profile found with this email.');
    }
}

checkUserBankInfo();
