import { supabase } from '../lib/supabase';

const logins = ['900909503999', '900909503277', '900909504798', '900909505154'];

async function debugAccounts() {
    console.log('--- Debugging Specific Accounts ---');

    for (const login of logins) {
        console.log(`\n🔍 Checking Login: ${login}`);
        
        // 1. Find challenge
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('id, user_id, login')
            .eq('login', parseInt(login))
            .maybeSingle();

        if (challengeError) {
            console.error(`Error fetching challenge for ${login}:`, challengeError.message);
            continue;
        }

        if (!challenge) {
            console.log(`❌ No challenge found for login ${login}`);
            continue;
        }

        console.log(`✅ Challenge found ID: ${challenge.id}, User ID: ${challenge.user_id}`);

        if (challenge.user_id) {
            // 2. Find profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', challenge.user_id)
                .maybeSingle();

            if (profileError) {
                 console.error(`Error fetching profile for ${challenge.user_id}:`, profileError.message);
            } else if (!profile) {
                console.log(`❌ No profile found for User ID ${challenge.user_id}`);
            } else {
                console.log(`✅ Profile found: ${profile.full_name} (${profile.email})`);
            }
        } else {
            console.log(`❌ Challenge ${challenge.id} has no user_id!`);
        }
    }
}

debugAccounts();
