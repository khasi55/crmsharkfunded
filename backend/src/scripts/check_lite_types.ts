
import { supabase } from '../lib/supabase';

async function run() {
    console.log("--- UNIQUE CHALLENGE TYPES ---");
    const { data, error } = await supabase.from('challenges').select('challenge_type');
    if (error) {
        console.error("Error:", error);
    } else {
        const types = new Set(data.map(d => d.challenge_type));
        console.log("Found types:", Array.from(types));
    }

    console.log("\n--- SAMPLES OF LITE ACCOUNTS ---");
    const { data: lite } = await supabase.from('challenges').select('*').ilike('challenge_type', '%lite%').limit(5);
    console.log("Lite samples:", JSON.stringify(lite, null, 2));
}

run();
