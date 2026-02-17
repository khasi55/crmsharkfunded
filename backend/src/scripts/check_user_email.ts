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

async function checkUser() {
    const email = 'siddareddy1947@gmail.com';
    console.log(`🔍 Checking user: ${email}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

    if (profile) {
        console.log('✅ Profile found:', profile);

        const { data: challenges } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', profile.id);

        console.log(`Found ${challenges?.length || 0} challenges.`);
        challenges?.forEach(c => console.log(`- [${c.login}] ${c.challenge_type} (${c.status})`));
    } else {
        console.log('❌ Profile not found.');
    }
}

checkUser();
