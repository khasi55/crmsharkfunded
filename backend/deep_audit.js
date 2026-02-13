
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepAudit() {
    const email = 'khasireddy3@gmail.com';
    console.log(`Deep audit for: ${email}`);

    // 1. Profiles
    const { data: profiles } = await supabase.from('profiles').select('*').eq('email', email);
    console.log(`Profiles found: ${profiles?.length || 0}`);
    profiles?.forEach(p => console.log(` - Profile ID: ${p.id}, Email: ${p.email}`));

    // 2. Challenges by Profile ID
    for (const p of (profiles || [])) {
        const { data: challenges } = await supabase.from('challenges').select('id, login, status, user_id').eq('user_id', p.id);
        console.log(`Challenges for Profile ID ${p.id}: ${challenges?.length || 0}`);
        challenges?.forEach(c => console.log(`   - Challenge: ${c.id}, Login: ${c.login}, UserID in Table: ${c.user_id}`));
    }

    // 3. Any challenges with this email in metadata (if any)
    const { data: metaChallenges } = await supabase.from('challenges').select('id, login, user_id, metadata').ilike('metadata->>email', `%${email}%`);
    console.log(`Challenges with email in metadata: ${metaChallenges?.length || 0}`);

    // 4. Check if auth.users has ANY user with this email (case-insensitive)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (authUser) {
        console.log(`AUTH USER FOUND: ID: ${authUser.id}, Email: ${authUser.email}`);
        const { data: authChallenges } = await supabase.from('challenges').select('id, login').eq('user_id', authUser.id);
        console.log(`Challenges for AUTH ID: ${authChallenges?.length || 0}`);
    } else {
        console.log('AUTH USER NOT FOUND in first 100 users.');
    }
}

deepAudit();
