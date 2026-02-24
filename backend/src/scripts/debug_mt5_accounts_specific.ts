
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function debugMT5AccountsSpecific() {
    console.log('--- Debugging Specific MT5 Accounts ---');

    const targetLogins = [900909493769, 900909493756, 900909493753];
    console.log('Target Logins:', targetLogins);

    // 1. Fetch Challenges
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .in('login', targetLogins);

    if (error) {
        console.error('Error fetching challenges:', error);
        return;
    }

    console.log(`Fetched ${challenges?.length} challenges.`);

    if (!challenges || challenges.length === 0) return;

    // 2. Extract user IDs
    const userIds = Array.from(new Set(challenges.map((c: any) => c.user_id).filter(Boolean)));
    console.log('User IDs to fetch:', userIds);

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
        console.log(`Challenge Login ${c.login} (User ${c.user_id}): Profile found? ${!!profile}`);
        if (!profile) {
            console.log(`  -> ❌ Missing profile for user_id: ${c.user_id}`);
        } else {
            console.log(`  -> ✅ Found: ${profile.email}`);
        }
    });

}

debugMT5AccountsSpecific().catch(console.error);
