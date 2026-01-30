import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey) as any;

const EMAIL = 'khasireddy3@gmail.com';
const SEARCH_ID = '2f877db1'; // Part of SF-2f877db1

async function checkUser() {
    console.log(`Checking user ${EMAIL}...`);
    // 1. Find User
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', EMAIL);

    if (userError || !users || users.length === 0) {
        console.log('User not found.');
    } else {
        const user = users[0];
        console.log('User:', user);

        // 2. Find Challenges
        const { data: challenges, error: challengeError } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', user.id);

        if (challenges) {
            console.log(`Found ${challenges.length} challenges.`);
            challenges.forEach((c: any) => console.log(`Challenge: ${c.id} | Login: ${c.login} | Status: ${c.status}`));
        }
    }

    // 3. Search for ID in likely places
    console.log(`\nSearching for ${SEARCH_ID} in database...`);

    // Check challenges ID
    const { data: chalMatch } = await supabase.from('challenges').select('*').ilike('id', `%${SEARCH_ID}%`);
    if (chalMatch && chalMatch.length > 0) console.log('Found in challenges.id:', chalMatch);

    // Check competitions ID
    const { data: compMatch } = await supabase.from('competitions').select('*').ilike('id', `%${SEARCH_ID}%`);
    if (compMatch && compMatch.length > 0) console.log('Found in competitions.id:', compMatch);

    // Check orders (if table exists - assuming 'orders' or 'payments')
    // I'll try 'orders' first
    try {
        const { data: orderMatch } = await supabase.from('orders').select('*').ilike('id', `%${SEARCH_ID}%`);
        if (orderMatch && orderMatch.length > 0) console.log('Found in orders.id:', orderMatch);
    } catch (e) { console.log('orders table might not exist or error'); }
}

checkUser();
