
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStatus() {
    // 1. Get Challenge
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', 889224209)
        .single();
    console.log("DB Data:", JSON.stringify(challenge, null, 2));
}
checkStatus();
