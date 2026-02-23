import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL/Key missing in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    console.log('--- Checking Supabase Configuration ---');
    console.log('URL:', supabaseUrl);
    console.log('Key (masked):', supabaseKey!.substring(0, 10) + '...');

    // 1. Check Storage Buckets
    console.log('\n--- Checking Storage Buckets ---');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
    } else {
        console.log('Buckets:', buckets.map(b => `${b.name} (public: ${b.public})`));
        const avatarBucket = buckets.find(b => b.name === 'avatars');
        if (!avatarBucket) {
            console.error('CRITICAL: "avatars" bucket NOT FOUND!');
        } else if (!avatarBucket.public) {
            console.warn('WARNING: "avatars" bucket is NOT PUBLIC!');
        } else {
            console.log('SUCCESS: "avatars" bucket exists and is public.');
        }
    }

    // 2. Check Profiles Table
    console.log('\n--- Checking Profiles Table ---');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (profileError) {
        console.error('Error fetching profile:', profileError);
    } else {
        console.log('SUCCESS: Can fetch profiles.');
        if (profile && profile.length > 0) {
            console.log('Columns:', Object.keys(profile[0]));
        }
    }

    // 3. Check Auth Admin
    console.log('\n--- Checking Auth Admin ---');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
        console.error('Error listing users (Admin API):', usersError);
        console.error('Is the key a SERVICE_ROLE key?');
    } else {
        console.log('SUCCESS: Can list users via Admin API. (Count:', users?.users?.length, ')');
    }

    process.exit(0);
}

checkConfig();
