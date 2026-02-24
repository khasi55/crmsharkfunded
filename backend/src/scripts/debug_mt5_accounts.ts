
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function debugMT5Accounts() {
    console.log('--- Debugging MT5 Accounts ---');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key Present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch Challenges
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching challenges:', error);
        return;
    }

    console.log(`Fetched ${challenges?.length} challenges.`);

    if (!challenges || challenges.length === 0) return;

    // 2. Extract user IDs
    const userIds = Array.from(new Set(challenges.map((c: any) => c.user_id).filter(Boolean)));
    console.log('User IDs in challenges:', userIds);

    // 3. Fetch Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
    } else {
        console.log(`Fetched ${profiles?.length} profiles.`);
        console.log('Profiles:', profiles);
    }

    // 4. Check mapping
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

    challenges.forEach((c: any) => {
        const profile = profileMap.get(c.user_id);
        console.log(`Challenge ${c.id} (User ${c.user_id}): Profile found? ${!!profile}`);
        if (!profile) {
            console.log('  -> Missing profile for user_id:', c.user_id);
        } else {
            console.log(`  -> details: ${profile.email}`);
        }
    });

}

debugMT5Accounts().catch(console.error);
