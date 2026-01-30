import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugCompetitionAssignment() {
    console.log('\n=== COMPETITION ASSIGNMENT DEBUGGER ===\n');

    // 1. List all competitions
    console.log('📋 Fetching all competitions...');
    const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false });

    if (compError) {
        console.error('❌ Error fetching competitions:', compError);
        return;
    }

    if (!competitions || competitions.length === 0) {
        console.log('❌ No competitions found in database');
        return;
    }

    console.table(competitions);
    console.log(`\nTotal competitions: ${competitions.length}\n`);

    // 2. For each competition, check participants
    for (const comp of competitions) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 COMPETITION: ${comp.title} (${comp.id})`);
        console.log(`   Status: ${comp.status}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Get participants for this competition
        const { data: participants, error: partError } = await supabase
            .from('competition_participants')
            .select('*')
            .eq('competition_id', comp.id)
            .order('score', { ascending: false });

        if (partError) {
            console.error(`   ❌ Error fetching participants:`, partError);
            continue;
        }

        if (!participants || participants.length === 0) {
            console.log(`   ⚠️ No participants found for this competition\n`);
            continue;
        }

        console.log(`   ✅ Found ${participants.length} participants:\n`);

        // Fetch user details and challenge info for each participant
        for (const p of participants) {
            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', p.user_id)
                .single();

            // Get challenge details if challenge_id exists
            let challengeInfo = null;
            if (p.challenge_id) {
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('id, login, server, status, initial_balance, current_equity')
                    .eq('id', p.challenge_id)
                    .single();
                challengeInfo = challenge;
            }

            console.log(`   👤 ${profile?.full_name || 'Unknown User'} (${profile?.email || 'No email'})`);
            console.log(`      User ID: ${p.user_id}`);
            console.log(`      Status: ${p.status}`);
            console.log(`      Score: ${p.score ?? 'N/A'}`);
            console.log(`      Rank: ${p.rank ?? 'N/A'}`);
            console.log(`      Joined: ${p.joined_at}`);

            if (challengeInfo) {
                console.log(`      Challenge:`);
                console.log(`         Login: ${challengeInfo.login}`);
                console.log(`         Server: ${challengeInfo.server}`);
                console.log(`         Status: ${challengeInfo.status}`);
                console.log(`         Initial Balance: ${challengeInfo.initial_balance}`);
                console.log(`         Current Equity: ${challengeInfo.current_equity}`);

                // Calculate gain
                const gain = challengeInfo.initial_balance > 0
                    ? ((challengeInfo.current_equity - challengeInfo.initial_balance) / challengeInfo.initial_balance) * 100
                    : 0;
                console.log(`         Gain: ${gain.toFixed(2)}%`);

                // Check if this account would be filtered out by leaderboard
                if (challengeInfo.status === 'breached' || challengeInfo.status === 'failed') {
                    console.log(`      ⚠️ WARNING: This account will be FILTERED OUT from leaderboard (status: ${challengeInfo.status})`);
                }
            } else {
                console.log(`      ⚠️ No challenge linked (challenge_id: ${p.challenge_id})`);
            }
            console.log('');
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DIAGNOSIS NOTES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Leaderboard fetches from competition_participants table');
    console.log('2. Accounts with status "breached" or "failed" are filtered out');
    console.log('3. Score is calculated as Gain % = ((current_equity - initial_balance) / initial_balance) * 100');
    console.log('4. Check if:');
    console.log('   - Participant exists in competition_participants table');
    console.log('   - Challenge is properly linked (challenge_id is not null)');
    console.log('   - Challenge status is not "breached" or "failed"');
    console.log('   - Score is being calculated correctly');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

debugCompetitionAssignment();
