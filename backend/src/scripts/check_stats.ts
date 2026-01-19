
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStats() {
    const { data: stats, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', '1b6a5f46-bbd1-4313-a953-33400e65e9a7')
        .order('close_time', { ascending: false });

    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log("Stats:", JSON.stringify(stats, null, 2));

    // Also check for any breach events in a hypothetical logs table if we had one, 
    // but for now let's just look at the challenge "metadata" or similar if we stored breach reason there.
    // The previous output didn't show breach reason in metadata.
}

checkStats();
