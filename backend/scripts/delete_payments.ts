
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);


const CHALLENGE_IDS = [
    "9504eabc-077e-4b89-9f24-f3a6f282a275",
    "e1010116-195c-4fd6-99fa-c34be96223a7",
    "d7a9e0b8-6d16-4b51-a55e-edf5f4b458e2"
];

async function main() {
    console.log(`🚀 Starting Cleanup for Orphaned Challenges...`);

    const { error: challengeError } = await supabase
        .from('challenges')
        .delete()
        .in('id', CHALLENGE_IDS);

    if (challengeError) {
        console.error('Error deleting challenges:', challengeError);
    } else {
        console.log(`✅ Deleted ${CHALLENGE_IDS.length} orphaned challenges.`);
    }

    console.log('🎉 Cleanup Complete!');
}

main().catch(console.error);
