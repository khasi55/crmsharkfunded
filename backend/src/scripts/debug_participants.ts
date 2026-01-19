
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkLeaderboard() {
    console.log("🔍 Checking Active Competitions...");

    // 1. Get Active Competition
    const { data: competitions } = await supabase
        .from('competitions')
        .select('*')
        .eq('status', 'active');

    if (!competitions || competitions.length === 0) {
        console.log("❌ No active competitions found.");
        return;
    }

    const compId = competitions[0].id;
    console.log(`✅ Found Competition: ${competitions[0].title} (${compId})`);

    // 2. Fetch Leaderboard via Service logic (simulated)
    // We'll just query the table directly to see who is qualified
    const { data: participants } = await supabase
        .from('competition_participants')
        .select('user_id, score, rank, status, challenge_id')
        .eq('competition_id', compId);

    if (!participants) {
        console.log("❌ No participants found in DB.");
        return;
    }

    console.log(`📊 Total Participants in DB: ${participants.length}`);

    // Check Filter Logic
    const active = participants.filter(p => p.status !== 'breached' && p.status !== 'failed');
    const breached = participants.filter(p => p.status === 'breached' || p.status === 'failed');

    console.log(`   - Active (Visible): ${active.length}`);
    console.log(`   - Breached (Hidden): ${breached.length}`);

    if (active.length > 0) {
        console.log("   First 3 Active:", active.slice(0, 3));
    } else {
        console.warn("⚠️ Leaderboard should be EMPTY based on current logic!");
    }
}

checkLeaderboard();
