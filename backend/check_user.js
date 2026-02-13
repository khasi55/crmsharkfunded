
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(email) {
    console.log(`Checking user: ${email}...`);

    // 1. Find profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (pError) {
        console.error('Profile Error:', pError);
    } else if (!profile) {
        console.warn('No profile found for this email.');
    } else {
        console.log('Profile Found:', { id: profile.id, email: profile.email, role: profile.role });

        // 2. Find challenges
        const { data: challenges, error: cError } = await supabase
            .from('challenges')
            .select('id, login, status, challenge_type')
            .eq('user_id', profile.id);

        if (cError) {
            console.error('Challenges Error:', cError);
        } else {
            console.log(`Challenges Found: ${challenges?.length || 0}`);
            challenges?.forEach(c => console.log(` - ID: ${c.id}, Login: ${c.login}, Status: ${c.status}`));
        }
    }
}

const email = process.argv[2] || 'khasireddy3@gmail.com';
checkUser(email);
