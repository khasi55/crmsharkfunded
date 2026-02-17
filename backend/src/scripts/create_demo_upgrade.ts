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

async function createDemoAccount() {
    const email = 'siddareddy1947@gmail.com';
    console.log(`🔍 Finding user: ${email}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

    if (!profile) {
        console.error('❌ Profile not found.');
        return;
    }

    const userId = profile.id;
    const login = Math.floor(1000000 + Math.random() * 9000000);

    console.log(`🚀 Creating demo "passed" account for User ${userId}, Login ${login}...`);

    const { data, error } = await supabase
        .from('challenges')
        .insert({
            user_id: userId,
            login: login,
            challenge_type: 'prime_2_step_phase_1',
            status: 'passed',
            initial_balance: 50000,
            current_balance: 54000,
            current_equity: 54000,
            start_of_day_equity: 50000,
            leverage: 100,
            master_password: 'DemoPassword123!',
            investor_password: 'DemoInvestor123!',
            server: 'ALFX Limited',
            group: 'demo\\S\\1-Pro',
            metadata: {
                is_demo_test: true,
                created_for: 'pending_upgrade_testing'
            },
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating demo account:', error.message);
    } else {
        console.log(`✅ Demo account created! ID: ${data.id}, Login: ${data.login}`);
        console.log(`\n🔗 This account should now appear in the "Pending Upgrades" section.`);
    }
}

createDemoAccount();
