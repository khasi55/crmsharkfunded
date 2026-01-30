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

const COMPETITION_ID = '15579444-b28d-420d-aa40-c892b4551dd2';

async function listParticipants() {
    console.log(`Listing participants for competition ${COMPETITION_ID}...`);

    const { data: participants, error } = await supabase
        .from('competition_participants')
        .select('id, user_id, challenge_id, status')
        .eq('competition_id', COMPETITION_ID);

    if (error) {
        console.error('Error fetching participants:', error);
        return;
    }

    if (!participants || participants.length === 0) {
        console.log('No participants found.');
        return;
    }

    console.log(`Found ${participants.length} participants:`);

    // Fetch user details for better identification
    for (const p of participants) {
        const { data: user } = await supabase.from('profiles').select('email, full_name').eq('id', p.user_id).single();
        const { data: challenge } = await supabase.from('challenges').select('login').eq('id', p.challenge_id).single();

        console.log(`- Participant ID: ${p.id}`);
        console.log(`  User: ${user?.email} (${user?.full_name})`);
        console.log(`  Challenge Login: ${challenge?.login}`);
        console.log('---');
    }
}

listParticipants();
