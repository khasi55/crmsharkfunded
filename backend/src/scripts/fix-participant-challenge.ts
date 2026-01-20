
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const userId = 'f97289f1-fc29-4ab3-a0d3-50bfc969c50e';
    const correctChallengeId = '64b3818f-b8ee-4117-9567-893a5aa5b931'; // Login 889224631
    const competitionId = 'e9e0d221-4925-4437-9572-90ea8bc22c2c';

    console.log(`🛠 Fixing Participant Challenge for User: ${userId}...`);
    console.log(`   - New Challenge ID: ${correctChallengeId}`);

    const { error } = await supabase
        .from('competition_participants')
        .update({
            challenge_id: correctChallengeId,
            score: 0, // Reset score so it recalculates
            rank: 9999,
            status: 'active'
        })
        .eq('user_id', userId)
        .eq('competition_id', competitionId);

    if (error) {
        console.error("❌ Error updating participant:", error);
    } else {
        console.log("✅ Participant updated successfully.");
    }
}

main();
