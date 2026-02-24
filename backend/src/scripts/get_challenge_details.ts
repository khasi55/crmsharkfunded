
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getChallengeDetails(login: string) {
    console.log(`Fetching details for login: ${login}`);
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (error || !challenge) {
        console.error('Challenge not found:', error?.message);
        return;
    }

    console.log('CHALLENGE_DETAILS:', JSON.stringify(challenge, null, 2));
}

const login = process.argv[2];
if (!login) {
    console.error('Usage: ts-node get_challenge_details.ts <login>');
    process.exit(1);
}

getChallengeDetails(login);
