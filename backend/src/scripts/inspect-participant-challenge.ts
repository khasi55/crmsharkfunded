
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const userId = 'f97289f1-fc29-4ab3-a0d3-50bfc969c50e';
    console.log(`Checking Participant for User ID: ${userId}...`);

    const { data: participant, error } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Error fetching participant:", error);
        return;
    }

    if (!participant) {
        console.log("❌ Participant not found.");
    } else {
        console.log("✅ Participant Found:");
        console.log(`   - Challenge ID: ${participant.challenge_id}`);
        console.log(`   - Competition ID: ${participant.competition_id}`);

        // Fetch that challenge details
        const { data: challenge } = await supabase
            .from('challenges')
            .select('login, current_equity, status, initial_balance')
            .eq('id', participant.challenge_id)
            .single();

        if (challenge) {
            console.log("\n🔗 Linked Challenge Details:");
            console.log(`   - Login: ${challenge.login}`);
            console.log(`   - Equity: ${challenge.current_equity}`);
            console.log(`   - Status: ${challenge.status}`);
        } else {
            console.log("❌ Linked Challenge not found in challenges table.");
        }
    }
}

main();
