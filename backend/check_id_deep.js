
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(email) {
    console.log(`Deep search for: ${email}...`);

    // 1. All Profiles
    const { data: profiles } = await supabase.from('profiles').select('*');
    const matchedProfiles = profiles.filter(p => p.email?.toLowerCase() === email.toLowerCase());

    console.log(`Matched Profiles: ${matchedProfiles.length}`);
    matchedProfiles.forEach(p => console.log(` - Profile ID: ${p.id}, Email: ${p.email}`));

    // 2. All Auth Users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Auth Error:', error.message);
        return;
    }

    const matchedAuth = users.filter(u => u.email?.toLowerCase() === email.toLowerCase());
    console.log(`Matched Auth Users: ${matchedAuth.length}`);
    matchedAuth.forEach(u => console.log(` - Auth ID: ${u.id}, Email: ${u.email}`));

    // 3. Challenges for these IDs
    const allIds = [...new Set([...matchedProfiles.map(p => p.id), ...matchedAuth.map(u => u.id)])];
    for (const id of allIds) {
        const { data: challenges } = await supabase.from('challenges').select('id, login').eq('user_id', id);
        console.log(`ID ${id}: Found ${challenges?.length || 0} challenges`);
    }
}

const email = process.argv[2] || 'khasireddy3@gmail.com';
checkUser(email.trim());
