import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
    const { data: challenge } = await supabase.from('challenges').select('group, challenge_type').eq('login', 900909495021).single();
    if (challenge) {
        console.log(`Account 900909495021 belongs to group: ${challenge.group} with challenge_type: ${challenge.challenge_type}`);
    } else {
        console.log(`Account not found.`);
    }
}
checkAccount();
