import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/viswanathreddy/Desktop/Sharkfunded/crmsharkfunded/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectNewAccount() {
    const login = 566953;
    console.log(`--- Inspecting New Account ${login} ---`);
    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (error) {
        console.error("Error fetching challenge:", error);
    } else {
        console.log("Challenge Data:", JSON.stringify(challenge, null, 2));
    }
}

inspectNewAccount();
