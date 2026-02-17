import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
    console.log('🧐 Verifying Fix for Blake Carter (aae9f79c)...\n');

    const { data: profile } = await supabase
        .from('profiles')
        .select('email, total_commission, referral_code')
        .eq('referral_code', 'aae9f79c')
        .maybeSingle();

    if (!profile) {
        console.log('❌ Profile not found.');
    } else {
        console.log(`Affiliate: ${profile.email}`);
        console.log(`Referral Code: ${profile.referral_code}`);
        console.log(`Total Commission: $${profile.total_commission}`);

        if (Math.abs(profile.total_commission - 23.52) < 0.01) {
            console.log('\n🌟 SUCCESS: Total commission correctly adjusted to $23.52!');
        } else if (profile.total_commission === 32.95) {
            console.log('\n⚠️ FAILURE: Total commission is still at the old value ($32.95).');
        } else {
            console.log(`\n⚠️ UNEXPECTED: Total commission is $${profile.total_commission}.`);
        }
    }
}

verifyFix();
