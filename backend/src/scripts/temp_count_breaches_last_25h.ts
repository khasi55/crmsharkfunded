import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countBreachesLast24Hours() {
    const now = new Date();
    const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log(`Checking for accounts breached since ${past24Hours.toISOString()} (Current time: ${now.toISOString()})`);

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('id, login, status, updated_at')
        .in('status', ['breached', 'failed'])
        .gte('updated_at', past24Hours.toISOString());

    if (error) {
        console.error("Error fetching challenges:", error.message);
        return;
    }

    console.log(`=== Total breached/failed accounts in the last 25 hours: ${challenges.length} ===`);
}

countBreachesLast24Hours();
