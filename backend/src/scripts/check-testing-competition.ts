import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const TESTING_COMPETITION_ID = '9e6c278e-2cba-4dd6-bf3d-1201bd4c7983';
const LOGIN = 889227425;

async function checkTestingCompetition() {
    console.log('\n=== CHECKING "TESTING" COMPETITION ===\n');

    // 1. Get competition details
    const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', TESTING_COMPETITION_ID)
        .single();

    console.log('📋 Competition:');
    console.log(`   Title: ${comp?.title}`);
    console.log(`   Status: ${comp?.status}`);
    console.log(`   ID: ${comp?.id}`);
    console.log(`   Created: ${comp?.created_at}\n`);

    // 2. Check participants
    const { data: participants } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', TESTING_COMPETITION_ID);

    console.log(`👥 Participants: ${participants?.length || 0}\n`);

    if (participants && participants.length > 0) {
        for (const p of participants) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', p.user_id)
                .single();

            const { data: challenge } = await supabase
                .from('challenges')
                .select('login, status, current_equity, initial_balance')
                .eq('id', p.challenge_id)
                .maybeSingle();

            console.log(`   👤 ${profile?.full_name || 'Unknown'}`);
            console.log(`      Email: ${profile?.email}`);
            console.log(`      Login: ${challenge?.login || 'N/A'}`);
            console.log(`      Challenge ID: ${p.challenge_id || 'NULL'}`);
            console.log(`      Status: ${p.status}`);
            console.log('');
        }
    }

    // 3. Check if login 889227425 is anywhere
    console.log(`\n🔍 Searching for account ${LOGIN}...\n`);

    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (!challenge) {
        console.log(`   ❌ Account ${LOGIN} not found in database`);
        return;
    }

    console.log(`   ✅ Account ${LOGIN} exists`);
    console.log(`      Challenge ID: ${challenge.id}`);
    console.log(`      User ID: ${challenge.user_id}`);

    // Check all competitions for this user
    const { data: allParticipations } = await supabase
        .from('competition_participants')
        .select('competition_id, challenge_id, status')
        .eq('user_id', challenge.user_id);

    console.log(`\n   User's competition participations:`);
    if (allParticipations && allParticipations.length > 0) {
        for (const p of allParticipations) {
            const { data: c } = await supabase
                .from('competitions')
                .select('title')
                .eq('id', p.competition_id)
                .single();

            console.log(`      - ${c?.title || p.competition_id}`);
            console.log(`        Challenge: ${p.challenge_id || 'NOT LINKED'}`);
            console.log(`        Status: ${p.status}`);
        }
    } else {
        console.log(`      ❌ No participations found`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 ACTION NEEDED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`1. Account ${LOGIN} needs to be added to "Testing" competition`);
    console.log(`2. Run the fix script to link the challenge`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkTestingCompetition();
