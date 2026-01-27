
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const challengeId = '122911be-4b48-41f8-afc0-593e59d8ba64';

    console.log("Testing query exactly as in objectives.ts...");

    // Exact request from objectives.ts
    const { data, error } = await supabase
        .from('challenges')
        .select('current_equity, initial_balance, start_of_day_equity, current_balance')
        .eq('id', challengeId)
        .single();

    if (error) {
        console.error(" Error:", error);
    } else {
        console.log(" Data:", data);
    }
}

testQuery();
