
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    console.log("🔍 Debugging Referral Codes...");

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .not('referral_code', 'is', null)
        .limit(20);

    console.log("Existing Referral Codes:");
    console.table(profiles);

    // Check if 'RR' exists
    const { data: rr } = await supabase
        .from('profiles')
        .select('id')
        .ilike('referral_code', 'RR');

    console.log(`Profiles with code 'RR': ${rr?.length}`);
}

debug();
