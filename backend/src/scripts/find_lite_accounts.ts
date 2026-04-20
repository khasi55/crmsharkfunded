
import { supabase } from '../lib/supabase';

async function run() {
    console.log("--- SEARCHING FOR LITE FUNDED ACCOUNTS ---");
    const { data: lite, error } = await supabase
        .from('challenges')
        .select('*')
        .ilike('challenge_type', '%lite%')
        .eq('status', 'active');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${lite?.length || 0} active Lite accounts.`);
        console.log("Samples:", JSON.stringify(lite?.slice(0, 3), null, 2));
    }
}

run();
