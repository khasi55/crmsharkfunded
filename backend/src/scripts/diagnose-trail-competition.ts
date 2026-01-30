import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const TRAIL_COMPETITION_ID = 'e751774b-a7c4-4836-b2bc-e0db453e8212';

async function checkTrailCompetition() {
    console.log('\n=== TRAIL COMPETITION ANALYSIS ===\n');

    // 1. Check competition details
    const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', TRAIL_COMPETITION_ID)
        .single();

    console.log('📋 Competition Details:');
    console.log(`   Title: ${comp?.title}`);
    console.log(`   Status: ${comp?.status}`);
    console.log(`   Created: ${comp?.created_at}`);
    console.log(`   Start: ${comp?.start_date}`);
    console.log(`   End: ${comp?.end_date}\n`);

    // 2. Check participants
    const { data: participants } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', TRAIL_COMPETITION_ID);

    console.log(`👥 Participants: ${participants?.length || 0}`);
    if (participants && participants.length > 0) {
        console.table(participants);
    } else {
        console.log('   ❌ NO PARTICIPANTS FOUND\n');
    }

    // 3. Check if any challenges have competition_id set in metadata
    const { data: challengesWithTrail } = await supabase
        .from('challenges')
        .select('id, login, user_id, status, created_at, metadata')
        .contains('metadata', { competition_id: TRAIL_COMPETITION_ID });

    console.log(`\n🔍 Challenges with Trail competition_id in metadata: ${challengesWithTrail?.length || 0}`);
    if (challengesWithTrail && challengesWithTrail.length > 0) {
        for (const c of challengesWithTrail) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', c.user_id)
                .single();

            console.log(`\n   Login: ${c.login}`);
            console.log(`   User: ${profile?.full_name} (${profile?.email})`);
            console.log(`   Status: ${c.status}`);
            console.log(`   Created: ${c.created_at}`);

            // Check if this is in competition_participants
            const { data: participation } = await supabase
                .from('competition_participants')
                .select('*')
                .eq('challenge_id', c.id)
                .maybeSingle();

            if (participation) {
                console.log(`   ✅ IS in competition_participants`);
            } else {
                console.log(`   ❌ NOT in competition_participants (THIS IS THE PROBLEM!)`);
            }
        }
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 DIAGNOSIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('The "Trail" competition leaderboard is empty because:');
    console.log('');
    console.log('1. The leaderboard fetches data from the "competition_participants" table');
    console.log('2. This table has ZERO entries for the "Trail" competition');
    console.log('3. When an account is assigned to a competition, it should create:');
    console.log('   - An entry in competition_participants table');
    console.log('   - A link between the challenge and competition');
    console.log('');
    console.log('SOLUTION:');
    console.log('You need to manually assign accounts to the Trail competition.');
    console.log('This should create entries in the competition_participants table.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkTrailCompetition();
