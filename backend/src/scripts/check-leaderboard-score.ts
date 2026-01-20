
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = 889224631;
    console.log(`Checking Leaderboard Score for Login: ${login}...`);

    // 1. Get User ID from Challenge
    const { data: challenge } = await supabase
        .from('challenges')
        .select('id, user_id, current_equity, initial_balance')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.log("❌ Challenge not found.");
        return;
    }

    const userId = challenge.user_id;
    console.log(`User ID: ${userId}`);
    console.log(`Equity: ${challenge.current_equity} | Balance: ${challenge.initial_balance}`);

    // 2. Get Score from Competition Participants
    const { data: participant } = await supabase
        .from('competition_participants')
        .select('score, rank, status')
        .eq('user_id', userId)
        .single(); // Assuming only one competition for now

    if (!participant) {
        console.log("❌ Participant record not found.");
    } else {
        console.log("✅ Leaderboard Record:");
        console.log(`   - Rank: ${participant.rank}`);
        console.log(`   - Score: ${participant.score}`);
        console.log(`   - Status: ${participant.status}`);

        const expectedScore = ((challenge.current_equity - challenge.initial_balance) / challenge.initial_balance) * 100;
        console.log(`\nℹ️ Expected Score (Equity based): ${expectedScore.toFixed(2)}`);
    }
}

main();
