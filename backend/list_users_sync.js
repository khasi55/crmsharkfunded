
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllUsers() {
    console.log('Listing all auth users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total Auth Users: ${users.length}`);
    users.forEach(u => {
        console.log(` - ${u.email} [${u.id}]`);
    });

    const target = users.find(u => u.email?.toLowerCase() === 'khasireddy3@gmail.com');
    if (target) {
        console.log('\nFOUND TARGET USER:');
        console.log(`Email: ${target.email}`);
        console.log(`ID: ${target.id}`);

        // Find profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', target.id).maybeSingle();
        console.log('Matching Profile:', profile ? 'Yes' : 'No');
        if (profile) {
            console.log(`Profile Email: ${profile.email}`);
        } else {
            const { data: altProfile } = await supabase.from('profiles').select('*').eq('email', target.email).maybeSingle();
            if (altProfile) {
                console.log(`Alternative Profile found with ID: ${altProfile.id}`);
            }
        }

        // Find challenges
        const { data: challenges } = await supabase.from('challenges').select('id, login').eq('user_id', target.id);
        console.log(`Challenges for Auth ID (${target.id}): ${challenges?.length || 0}`);

        if (challenges?.length === 0) {
            const { data: altChallenges } = await supabase.from('challenges').select('id, login, user_id').eq('user_id', '04a05ed2-1e1d-45aa-86d2-d0572501e7ed');
            console.log(`Challenges found for Profile ID (04a05ed2...): ${altChallenges?.length || 0}`);
        }
    } else {
        console.log('\nTarget user NOT found in auth.users');
    }
}

listAllUsers();
