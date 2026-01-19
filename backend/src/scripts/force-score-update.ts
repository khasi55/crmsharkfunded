
import { updateLeaderboardScores } from '../services/leaderboard-service';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function forceUpdate() {
    console.log("Forcing Leaderboard Update...");

    const { data: activeCompetitions } = await supabase
        .from('competitions')
        .select('id, title')
        .eq('status', 'active');

    if (!activeCompetitions || activeCompetitions.length === 0) {
        console.log("No active competitions.");
        return;
    }

    for (const comp of activeCompetitions) {
        console.log(`Updating scores for: ${comp.title}`);
        await updateLeaderboardScores(comp.id);
    }
    console.log("✅ Done.");
}

forceUpdate();
