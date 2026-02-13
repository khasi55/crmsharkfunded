
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
    const email = 'khasireddy3@gmail.com';
    console.log(`Searching for user: ${email}...`);

    // Pagination search
    let page = 1;
    let found = false;

    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 100
        });

        if (error) {
            console.error('Error:', error);
            break;
        }

        if (users.length === 0) break;

        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (user) {
            console.log('FOUND USER:', { id: user.id, email: user.email, created_at: user.created_at });
            found = true;

            // Check Profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (profile) {
                console.log('Profile Match Found:', { id: profile.id, email: profile.email });
            } else {
                console.log('NO PROFILE MATCH for Auth ID:', user.id);
                // Search profile by email
                const { data: profileByEmail } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
                if (profileByEmail) {
                    console.log('Discrepancy: Profile exists with different ID:', profileByEmail.id);
                }
            }

            // Check Challenges
            const { data: challenges } = await supabase.from('challenges').select('id, login, user_id').eq('user_id', user.id);
            console.log(`Challenges for Auth ID: ${challenges?.length || 0}`);

            break;
        }

        page++;
        if (page > 10) break; // Safety
    }

    if (!found) console.log('User not found in any page of auth.users');
}

findUser();
