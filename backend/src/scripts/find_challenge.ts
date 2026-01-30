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

async function findChallenge() {
    console.log('Searching for challenge with login 889227544...');

    // Find Challenge by Login
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', '889227544');

    if (error) {
        console.error('Error finding challenge:', error);
        return;
    }

    if (!challenges || challenges.length === 0) {
        console.log('Challenge not found for login 889227544.');
    } else {
        const c = challenges[0];
        console.log(`FOUND CHALLENGE: ID: ${c.id} | Login: ${c.login} | Status: ${c.status} | UserID: ${c.user_id}`);
        console.log('Metadata:', JSON.stringify(c.metadata, null, 2));

        // Also check if already in any competition
        const { data: parts } = await supabase
            .from('competition_participants')
            .select('*')
            .eq('challenge_id', c.id);

        console.log('Competition Participants records:', parts);
    }
}

findChallenge();
