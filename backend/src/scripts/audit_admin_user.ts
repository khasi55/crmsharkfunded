
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditAdminUser() {
    const email = 'd3devansh12@gmail.com';

    console.log(`Auditing admin user: ${email}...`);

    const { data: user, error } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, permissions, created_at')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (!user) {
        console.log('❌ User NOT found in admin_users table.');
        console.log('Checking public.profiles table...');

        console.log('Checking public.profiles table for ANY column indicating admin status...');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*') // createClient types might not handle this if generics aren't set, but JS runtime will work
            .eq('email', email)
            .maybeSingle();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
        }

        if (profile) {
            console.log('\n--- Public Profile Details (Raw Keys) ---');
            console.log('Keys:', Object.keys(profile));
            console.log('Values:', profile);
            console.log('------------------------------\n');
            return;
        }

        console.log('❌ User NOT found in profiles table either!');
        return;
    }

    console.log('\n--- Admin User Details ---');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name}`);
    console.log(`Role: ${user.role} ${user.role === 'admin' || user.role === 'super_admin' ? '✅ (Authorized)' : '❌ (Unauthorized)'}`);
    console.log(`Permissions: ${JSON.stringify(user.permissions)}`);
    console.log(`Created At: ${user.created_at}`);
    console.log('--------------------------\n');
}

auditAdminUser();
