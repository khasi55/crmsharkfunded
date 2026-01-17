
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Competition Scheduler: Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export function startCompetitionScheduler() {
    console.log("🏆 Competition Scheduler initialized. Schedule: '*/10 * * * *' (Every 10 Minutes)");

    cron.schedule('*/10 * * * *', async () => {
        await checkCompetitionStatus();
    });
}

async function checkCompetitionStatus() {
    // console.log("🏆 [Competition Scheduler] Checking dates...");
    const now = new Date().toISOString();

    try {
        // 1. Start Competitions (Upcoming -> Active)
        const { data: starting, error: startError } = await supabase
            .from('competitions')
            .update({ status: 'active' })
            .eq('status', 'upcoming')
            .lte('start_date', now)
            .select();

        if (startError) console.error("Error starting competitions:", startError);
        if (starting && starting.length > 0) {
            console.log(`✅ Started ${starting.length} competitions: ${starting.map(c => c.title).join(', ')}`);
        }

        // 2. End Competitions (Active -> Ended)
        const { data: ending, error: endError } = await supabase
            .from('competitions')
            .update({ status: 'ended' })
            .eq('status', 'active')
            .lte('end_date', now)
            .select();

        if (endError) console.error("Error ending competitions:", endError);
        if (ending && ending.length > 0) {
            console.log(`🏁 Ended ${ending.length} competitions: ${ending.map(c => c.title).join(', ')}`);

            // TODO: Optional - Disable trading for participants of ended competitions
            // This would require fetching all participants and calling the bridge or updating challenge status.
            // keeping it simple for now as requested.
        }

    } catch (e) {
        console.error("❌ Competition Scheduler Error:", e);
    }
}
