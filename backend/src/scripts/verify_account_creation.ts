
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const userId = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';
    console.log(`Checking challenges for user: ${userId}`);

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching challenges:', error.message);
        return;
    }

    if (!challenges || challenges.length === 0) {
        console.log('No challenges found for this user.');
        return;
    }

    console.log('Latest Challenge Result:');
    const c = challenges[0];
    console.log(`- ID: ${c.id}`);
    console.log(`- Login: ${c.login}`);
    console.log(`- Type: ${c.challenge_type}`);
    console.log(`- Status: ${c.status}`);
    console.log(`- Balance: ${c.initial_balance}`);
    console.log(`- Created At: ${c.created_at}`);
}

check();
