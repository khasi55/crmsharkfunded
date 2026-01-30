import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const TRAIL_COMPETITION_ID = 'e751774b-a7c4-4836-b2bc-e0db453e8212';

async function diagnoseAndFix() {
    console.log('\n=== DIAGNOSING TRAIL COMPETITION ===\n');

    // 1. Check competition status
    const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', TRAIL_COMPETITION_ID)
        .single();

    console.log('📋 Competition Details:');
    console.log(`   Title: ${comp?.title}`);
    console.log(`   Status: ${comp?.status}`);
    console.log(`   Start Date: ${comp?.start_date}`);
    console.log(`   End Date: ${comp?.end_date}`);

    if (comp?.status !== 'active') {
        console.log('\n⚠️ PROBLEM FOUND: Competition status is NOT "active"');
        console.log('   The leaderboard broadcaster only processes "active" competitions.');
        console.log('\n   Updating status to "active"...');

        const { error } = await supabase
            .from('competitions')
            .update({ status: 'active' })
            .eq('id', TRAIL_COMPETITION_ID);

        if (error) {
            console.error('   ❌ Failed to update:', error);
        } else {
            console.log('   ✅ Competition status updated to "active"');
        }
    } else {
        console.log('\n✅ Competition status is already "active"');
    }

    // 2. Check participants
    const { data: participants } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', TRAIL_COMPETITION_ID);

    console.log(`\n👥 Participants: ${participants?.length || 0}`);

    if (participants && participants.length > 0) {
        for (const p of participants) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', p.user_id)
                .single();

            console.log(`\n   - ${profile?.full_name || 'Unknown'}`);
            console.log(`     Challenge ID: ${p.challenge_id || 'NULL (PROBLEM!)'}`);
            console.log(`     Status: ${p.status}`);
            console.log(`     Score: ${p.score}`);
        }
    } else {
        console.log('   ❌ No participants found!');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Competition status should now be "active"');
    console.log('2. Wait 30 seconds for leaderboard broadcaster to pick it up');
    console.log('3. Or manually trigger leaderboard update');
    console.log('4. Check the leaderboard at: /api/competitions/' + TRAIL_COMPETITION_ID + '/leaderboard');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

diagnoseAndFix();
