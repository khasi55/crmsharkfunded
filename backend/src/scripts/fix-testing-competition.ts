import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const TESTING_COMPETITION_ID = '9e6c278e-2cba-4dd6-bf3d-1201bd4c7983';
const CHALLENGE_ID = 'b909f58b-bd98-4057-9945-019e3f9d9301';
const USER_ID = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';

async function fixTestingCompetition() {
    console.log('\n=== FIXING TESTING COMPETITION ===\n');

    // Step 1: Update competition status to active
    console.log('Step 1: Updating competition status to "active"...');
    const { error: statusError } = await supabase
        .from('competitions')
        .update({ status: 'active' })
        .eq('id', TESTING_COMPETITION_ID);

    if (statusError) {
        console.error('   ❌ Failed:', statusError);
    } else {
        console.log('   ✅ Competition status updated to "active"');
    }

    // Step 2: Link challenge to participant
    console.log('\nStep 2: Linking challenge to competition participant...');
    const { error: linkError } = await supabase
        .from('competition_participants')
        .update({
            challenge_id: CHALLENGE_ID,
            status: 'active'
        })
        .eq('competition_id', TESTING_COMPETITION_ID)
        .eq('user_id', USER_ID);

    if (linkError) {
        console.error('   ❌ Failed:', linkError);
    } else {
        console.log('   ✅ Challenge linked successfully');
    }

    // Step 3: Verify
    console.log('\nStep 3: Verifying...\n');

    const { data: comp } = await supabase
        .from('competitions')
        .select('title, status')
        .eq('id', TESTING_COMPETITION_ID)
        .single();

    const { data: participant } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', TESTING_COMPETITION_ID)
        .eq('user_id', USER_ID)
        .single();

    console.log('📋 Competition:');
    console.log(`   Title: ${comp?.title}`);
    console.log(`   Status: ${comp?.status}`);

    console.log('\n👤 Participant:');
    console.log(`   User ID: ${participant?.user_id}`);
    console.log(`   Challenge ID: ${participant?.challenge_id}`);
    console.log(`   Status: ${participant?.status}`);
    console.log(`   Score: ${participant?.score}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FIX COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('The account should now appear in the "Testing" competition leaderboard.');
    console.log('Check at: GET /api/competitions/' + TESTING_COMPETITION_ID + '/leaderboard');
    console.log('\nNote: The leaderboard updates every 30 seconds via the broadcaster.');
    console.log('You may need to wait up to 30 seconds to see the change.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

fixTestingCompetition();
