
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

async function listProfiles() {
    console.log(`Listing first 100 profiles...`);
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log('Profiles found:', JSON.stringify(profiles, null, 2));
    }
}

listProfiles();
