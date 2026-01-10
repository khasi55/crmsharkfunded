import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/viswanathreddy/Desktop/Sharkfunded/crmsharkfunded/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrades() {
    const login = 566948;
    console.log(`--- Checking Trades for Account ${login} ---`);
    const { data: challenge } = await supabase.from('challenges').select('id').eq('login', login).single();
    if (!challenge) {
        return console.log('Challenge not found');
    }

    const { data: trades } = await supabase.from('trades').select('*').eq('challenge_id', challenge.id);
    console.log('Trades count:', trades?.length || 0);
    if (trades?.length) {
        console.log('Sample trade:', JSON.stringify(trades[0], null, 2));
    }
}

checkTrades();
