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

const LOGIN = '889227544';
const COMPETITION_ID = '15579444-b28d-420d-aa40-c892b4551dd2'; // Shark Battle Ground Finale

async function linkUser() {
    console.log(`Linking login ${LOGIN} to competition ${COMPETITION_ID}...`);

    // 1. Get Challenge
    const { data: challenges } = await supabase.from('challenges').select('*').eq('login', LOGIN);
    if (!challenges || challenges.length === 0) {
        console.error('Challenge not found');
        return;
    }
    const challenge = challenges[0];
    console.log(`Found Challenge: ${challenge.id}`);

    // 2. Update Metadata
    const newMeta = {
        ...challenge.metadata,
        is_competition: true,
        competition_id: COMPETITION_ID
    };

    const { error: metaError } = await supabase
        .from('challenges')
        .update({ metadata: newMeta })
        .eq('id', challenge.id);

    if (metaError) console.error('Failed to update metadata:', metaError);
    else console.log('✅ Metadata updated.');

    // 3. Insert Participant
    const { error: partError } = await supabase
        .from('competition_participants')
        .insert({
            competition_id: COMPETITION_ID,
            user_id: challenge.user_id,
            challenge_id: challenge.id,
            status: 'active'
        });

    if (partError) {
        if (partError.code === '23505') console.log('✅ User already in participants table.');
        else console.error('Failed to insert participant:', partError);
    } else {
        console.log('✅ Participant inserted.');
    }
}

linkUser();
