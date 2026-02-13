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

async function checkUserChallenges(userId: string) {
    console.log(`🔍 Checking challenges for user: ${userId}...`);
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching challenges:', error);
        return;
    }

    console.log(`Found ${data?.length || 0} challenges.`);
    console.log(JSON.stringify(data, null, 2));
}

const USER_ID = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';
checkUserChallenges(USER_ID);
