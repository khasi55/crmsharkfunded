
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

    // 1. Find all profiles with this email
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (pError) {
        console.error('Profile Error:', pError);
        return;
    }

    console.log(`Profiles found: ${profiles.length}`);
    profiles.forEach(p => console.log(` - ID: ${p.id}, Email: ${p.email}, Created: ${p.created_at}`));

    // 2. Check auth.users (if possible via service role)
    // Note: service role can access auth schema if enabled in Supabase settings
    try {
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('Auth User List Error:', authError.message);
        } else {
            const authUser = users.find(u => u.email === email);
            if (authUser) {
                console.log('Auth User Found:', { id: authUser.id, email: authUser.email });

                // Compare with challenges
                const { data: challenges } = await supabase
                    .from('challenges')
                    .select('id, user_id, login')
                    .eq('user_id', authUser.id);
                console.log(`Challenges matching AUTH ID (${authUser.id}): ${challenges?.length || 0}`);
            } else {
                console.warn('No user found in auth.users for this email.');
            }
        }
    } catch (e) {
        console.error('Auth check failed:', e.message);
    }
}

const email = process.argv[2] || 'khasireddy3@gmail.com';
checkUser(email);
