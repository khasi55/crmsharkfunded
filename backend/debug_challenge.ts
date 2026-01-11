import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChallenge() {
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', 566971)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Challenge Data:', JSON.stringify(data, null, 2));
    }
}

checkChallenge();
