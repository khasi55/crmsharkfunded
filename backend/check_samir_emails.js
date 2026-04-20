
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

async function checkSamirEmails() {
    const email1 = 'samirhansda6219@gmail.com';
    const email2 = 'samirhansda2007@gmail.com';

    console.log(`Checking accounts for Samir Hansda:`);
    console.log(`1. ${email1}`);
    console.log(`2. ${email2}`);

    for (const email of [email1, email2]) {
        console.log(`\n--- ${email} ---`);
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .maybeSingle();

        if (pError) {
            console.error(`Error checking profile ${email}:`, pError);
            continue;
        }

        if (profile) {
            console.log(`Found Profile: ID: ${profile.id}, Name: ${profile.full_name}`);

            // Check challenges
            const { count: challengeCount } = await supabase
                .from('challenges')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id);
            console.log(`Challenges: ${challengeCount}`);

            // Check orders
            const { count: orderCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id);
            console.log(`Orders: ${orderCount}`);
        } else {
            console.log(`No profile found for ${email}`);
        }
    }
}

checkSamirEmails();
