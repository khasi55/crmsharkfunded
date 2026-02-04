
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkCode() {
    const code = '7d23df0';
    console.log(`Checking code: '${code}'`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, referral_code')
        .eq('referral_code', code)
        .single();

    if (profile) {
        console.log('✅ Found Profile:', profile);
    } else {
        console.log('❌ Code NOT found.');
    }

    // Check Case Insensitive
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, referral_code')
        .ilike('referral_code', code);

    if (profiles && profiles.length > 0) {
        console.log('🔍 Case-insensitive matches:', profiles);
    }
}

checkCode();
