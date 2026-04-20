
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

async function getAssociatedData(profileId) {
    const results = {};
    const tables = ['challenges', 'orders', 'transactions', 'notifications'];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profileId);

        if (error) {
            results[table] = `Error: ${error.message}`;
        } else {
            results[table] = count;
        }
    }
    return results;
}

async function verifyEmails() {
    const wrongEmail = 'sahilsahil19998@gmail.com';
    const correctEmail = 'kaifkhankaif9079@gmail.com';

    console.log(`Checking for wrong email: ${wrongEmail}...`);
    const { data: wrongProfile, error: wError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', wrongEmail)
        .maybeSingle();

    if (wError) {
        console.error('Error fetching wrong email profile:', wError);
    } else if (wrongProfile) {
        console.log('Wrong email profile found:', { id: wrongProfile.id, email: wrongProfile.email, full_name: wrongProfile.full_name });
        const data = await getAssociatedData(wrongProfile.id);
        console.log('Associated Data (Wrong):', data);
    } else {
        console.log('No profile found with wrong email.');
    }

    console.log(`\nChecking for correct email: ${correctEmail}...`);
    const { data: correctProfile, error: cError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', correctEmail)
        .maybeSingle();

    if (cError) {
        console.error('Error fetching correct email profile:', cError);
    } else if (correctProfile) {
        console.log('Correct email profile ALREADY exists:', { id: correctProfile.id, email: correctProfile.email, full_name: correctProfile.full_name });
        const data = await getAssociatedData(correctProfile.id);
        console.log('Associated Data (Correct):', data);
    } else {
        console.log('No profile found with correct email.');
    }
}

verifyEmails();
