import cron from 'node-cron';
import { supabase } from '../lib/supabase';

export function startCompetitionScheduler() {
    const DEBUG = process.env.DEBUG === 'true';
    if (DEBUG) console.log(" Competition Scheduler initialized. Schedule: '*/10 * * * *' (Every 10 Minutes)");

    cron.schedule('*/10 * * * *', async () => {
        await checkCompetitionStatus();
    });
}

async function checkCompetitionStatus() {

    const now = new Date().toISOString();

    try {

        const { data: starting, error: startError } = await supabase
            .from('competitions')
            .update({ status: 'active' })
            .eq('status', 'upcoming')
            .lte('start_date', now)
            .select();

        if (startError) console.error("Error starting competitions:", startError);
        if (starting && starting.length > 0) {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log(` Started ${starting.length} competitions: ${starting.map(c => c.title).join(', ')}`);
        }


        const { data: ending, error: endError } = await supabase
            .from('competitions')
            .update({ status: 'ended' })
            .eq('status', 'active')
            .lte('end_date', now)
            .select();

        if (endError) console.error("Error ending competitions:", endError);
        if (ending && ending.length > 0) {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.log(` Ended ${ending.length} competitions: ${ending.map(c => c.title).join(', ')}`);


        }

    } catch (e) {
        console.error("Competition Scheduler Error:", e);
    }
}
