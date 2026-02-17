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

async function createPassedAccount() {
    // 1. Find a user
    let { data: profile } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .limit(1)
        .single();

    if (!profile) {
        console.log("⚠️ No users found. Creating a test user...");
        const testEmail = `test_user_${Date.now()}@example.com`;
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: 'TestPassword123!',
            email_confirm: true
        });

        if (createError) {
            console.error("❌ Failed to create test user:", createError.message);
            return;
        }

        // Wait a bit for trigger
        await new Promise(r => setTimeout(r, 2000));

        const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', newUser.user.id).single();
        profile = newProfile;
    }

    if (!profile) {
        console.error("❌ Could not get a user profile.");
        return;
    }

    console.log(`👤 Using User: ${profile.email} (${profile.id})`);

    const login = Math.floor(10000000 + Math.random() * 90000000); // 8 digit login

    console.log(`🚀 Creating 'passed' account ${login}...`);

    const { data, error } = await supabase
        .from('challenges')
        .insert({
            user_id: profile.id,
            login: login,
            challenge_type: 'prime_2_step_phase_1',
            status: 'passed',
            initial_balance: 100000,
            current_balance: 108000,
            current_equity: 108000,
            start_of_day_equity: 100000,
            leverage: 100,
            server: 'ALFX-Demo',
            group: 'demo\\S\\1-Pro',
            platform: 'mt5',
            metadata: {
                is_test: true,
                note: 'Created for Disable button testing'
            }
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating account:', error.message);
    } else {
        console.log(`✅ Account Created Successfully!`);
        console.log(`Login: ${data.login}`);
        console.log(`Status: ${data.status}`);
        console.log(`User: ${profile.email}`);
        console.log(`\n👉 Go to "Passed Accounts" in Admin Panel to test Disable/Enable.`);
    }
}

createPassedAccount();
