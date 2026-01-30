import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const TRAIL_COMPETITION_ID = 'e751774b-a7c4-4836-b2bc-e0db453e8212';
const LOGIN = 889227425;

async function checkAccount() {
    console.log(`\n=== CHECKING ACCOUNT ${LOGIN} ===\n`);

    // 1. Check if challenge exists
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .maybeSingle();

    if (challengeError) {
        console.error('Error fetching challenge:', challengeError);
        return;
    }

    if (!challenge) {
        console.log(`❌ Challenge with login ${LOGIN} NOT FOUND in database`);
        console.log('\nThis means the MT5 account creation failed completely.');
        console.log('Check the MT5 Bridge API Key configuration.\n');
        return;
    }

    console.log(`✅ Challenge exists in database:`);
    console.log(`   Challenge ID: ${challenge.id}`);
    console.log(`   User ID: ${challenge.user_id}`);
    console.log(`   Login: ${challenge.login}`);
    console.log(`   Server: ${challenge.server}`);
    console.log(`   Status: ${challenge.status}`);
    console.log(`   Initial Balance: ${challenge.initial_balance}`);
    console.log(`   Current Equity: ${challenge.current_equity}`);
    console.log(`   Metadata:`, JSON.stringify(challenge.metadata, null, 2));

    // 2. Get user details
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', challenge.user_id)
        .single();

    console.log(`\n👤 User: ${profile?.full_name || 'Unknown'} (${profile?.email || 'N/A'})`);

    // 3. Check competition_participants
    const { data: participation, error: partError } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('user_id', challenge.user_id)
        .eq('competition_id', TRAIL_COMPETITION_ID)
        .maybeSingle();

    console.log(`\n📊 Competition Participation (Trail):`);
    if (participation) {
        console.log(`   ✅ FOUND in competition_participants:`);
        console.log(`      Competition ID: ${participation.competition_id}`);
        console.log(`      Challenge ID: ${participation.challenge_id}`);
        console.log(`      Status: ${participation.status}`);
        console.log(`      Score: ${participation.score ?? 'N/A'}`);
        console.log(`      Rank: ${participation.rank ?? 'N/A'}`);
        console.log(`      Joined: ${participation.joined_at}`);

        if (participation.challenge_id === challenge.id) {
            console.log(`\n   ✅ Challenge is CORRECTLY LINKED to competition participant`);
        } else if (participation.challenge_id) {
            console.log(`\n   ⚠️ Challenge ID mismatch!`);
            console.log(`      Expected: ${challenge.id}`);
            console.log(`      Actual: ${participation.challenge_id}`);
        } else {
            console.log(`\n   ⚠️ Challenge ID is NULL - needs to be linked!`);
        }
    } else {
        console.log(`   ❌ NOT FOUND in competition_participants table`);
        console.log(`\n   This is why the account is not showing in the leaderboard!`);
    }

    // 4. Check ALL participations for this user
    const { data: allParticipations } = await supabase
        .from('competition_participants')
        .select('competition_id, status, challenge_id')
        .eq('user_id', challenge.user_id);

    if (allParticipations && allParticipations.length > 0) {
        console.log(`\n📋 All competitions this user is in:`);
        for (const p of allParticipations) {
            const { data: comp } = await supabase
                .from('competitions')
                .select('title')
                .eq('id', p.competition_id)
                .single();

            console.log(`   - ${comp?.title || p.competition_id}`);
            console.log(`     Status: ${p.status}, Challenge: ${p.challenge_id || 'Not linked'}`);
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (participation && participation.challenge_id === challenge.id) {
        console.log('✅ Account is properly linked to Trail competition');
        console.log('   It should appear in the leaderboard shortly.');
        console.log('   If not, check the leaderboard service logs.');
    } else if (participation && !participation.challenge_id) {
        console.log('⚠️ Participant exists but challenge_id is NULL');
        console.log('   Need to update competition_participants.challenge_id');
    } else if (!participation) {
        console.log('❌ Account exists but NOT in competition_participants table');
        console.log('   This is why it\'s not showing in the leaderboard.');
        console.log('   Need to create a competition_participants entry.');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkAccount();
