
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

async function checkSchema() {
    // Try to get one row to see columns
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Profile columns:', Object.keys(data[0] || {}));
    }

    const { data: cData, error: cError } = await supabase.from('challenges').select('*').limit(1);
    if (cError) {
        console.error('Error fetching challenges:', cError);
    } else {
        console.log('Challenge columns:', Object.keys(cData[0] || {}));
    }
}

checkSchema();
