import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const oldEmail = 'daxfx2712@gmail.com';
    const newEmail = 'akshitfx18@gmail.com';
    const newPassword = 'Dax@00';

    console.log(`Starting update for user: ${oldEmail}`);

    // 1. Find user in profiles
    console.log('Finding user in profiles table...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', oldEmail)
        .maybeSingle();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    let userId = profile?.id;

    if (!userId) {
        console.log(`User not found in profiles by email. Trying to find via auth.admin API...`);
        // Note: listUsers is paginated, but let's try a simple approach first if profile fails.
        let page = 1;
        while (true) {
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
            if (listError || !users.length) break;
            const u = users.find(u => u.email === oldEmail);
            if (u) {
                userId = u.id;
                break;
            }
            page++;
        }
    }

    if (!userId) {
        console.error(`Could not find a user ID for ${oldEmail}`);
        return;
    }

    console.log(`Found user ID: ${userId}`);

    // 2. Update Auth (Email and Password)
    console.log(`Updating Auth credentials...`);
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
        password: newPassword,
        email_confirm: true // bypass email confirmation
    });

    if (authUpdateError) {
        console.error('Failed to update auth credentials:', authUpdateError);
        return;
    }
    console.log('Successfully updated Supabase Auth (email and password).');

    // 3. Update Profile Table
    console.log(`Updating Profiles table email...`);
    const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', userId);

    if (profileUpdateError) {
        console.error('Failed to update email in profiles table:', profileUpdateError);
        return;
    }

    console.log('Successfully updated profiles table.');
    console.log(`Done! User ${oldEmail} is now ${newEmail} with new password.`);
}

main().catch(console.error);
