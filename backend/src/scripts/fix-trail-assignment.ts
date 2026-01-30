import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const TRAIL_COMPETITION_ID = 'e751774b-a7c4-4836-b2bc-e0db453e8212';
const CHALLENGE_ID = 'b909f58b-bd98-4057-9945-019e3f9d9301';
const USER_ID = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';

async function linkChallengeToCompetition() {
    console.log('\n=== LINKING CHALLENGE TO COMPETITION ===\n');

    console.log(`Challenge ID: ${CHALLENGE_ID}`);
    console.log(`Competition ID: ${TRAIL_COMPETITION_ID}`);
    console.log(`User ID: ${USER_ID}`);

    // Update competition_participants to link the challenge
    const { data, error } = await supabase
        .from('competition_participants')
        .update({
            challenge_id: CHALLENGE_ID,
            status: 'active'
        })
        .eq('competition_id', TRAIL_COMPETITION_ID)
        .eq('user_id', USER_ID)
        .select();

    if (error) {
        console.error('\n❌ Error updating competition_participants:', error);
        return;
    }

    console.log('\n✅ Successfully linked challenge to competition!');
    console.log('Updated record:', JSON.stringify(data, null, 2));

    // Verify the update
    const { data: verification } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', TRAIL_COMPETITION_ID)
        .eq('user_id', USER_ID)
        .single();

    console.log('\n📋 Verification:');
    console.log(`   Competition ID: ${verification?.competition_id}`);
    console.log(`   User ID: ${verification?.user_id}`);
    console.log(`   Challenge ID: ${verification?.challenge_id}`);
    console.log(`   Status: ${verification?.status}`);
    console.log(`   Score: ${verification?.score}`);

    console.log('\n✅ The account should now appear in the Trail competition leaderboard!');
    console.log('   Note: The leaderboard may take up to 30 seconds to update due to caching.');
    console.log('\n');
}

linkChallengeToCompetition();
