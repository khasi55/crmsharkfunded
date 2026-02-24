
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (!supabaseUrl) {
    console.error('Error: Supabase URL not found in environment variables.');
    process.exit(1);
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
    console.error('Error: Supabase Service Role Key not found in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LOGIN = "900909493890";

async function findAccountCreator() {
    console.log(`\n=== FINDING CREATOR FOR ACCOUNT ${LOGIN} ===\n`);

    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .maybeSingle();

    if (challengeError) {
        console.error('Error fetching challenge from DB:', challengeError);
        return;
    }

    if (!challenge) {
        console.log(`❌ Account with login ${LOGIN} NOT FOUND in database.`);
        return;
    }

    console.log(`✅ Account Found:`);
    console.log(`   ID: ${challenge.id}`);
    console.log(`   User ID: ${challenge.user_id}`);
    console.log(`   Status: ${challenge.status}`);
    console.log(`   Created At: ${challenge.created_at}`);

    if (challenge.metadata) {
        console.log(`   Metadata:`, JSON.stringify(challenge.metadata, null, 2));
    }

    if (challenge.user_id) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', challenge.user_id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
        } else if (profile) {
            console.log(`\n👤 OWNER DETAILS (User ID: ${challenge.user_id}):`);
            console.log(`   Full Name: ${profile.full_name}`);
            console.log(`   Email: ${profile.email}`);
            console.log(`   Role: ${profile.role}`);
            console.log(`   Created At: ${profile.created_at}`);
        }
    }

    // Look for manual assignment in audit logs or orders if available
    console.log(`\n🔍 CHECKING ORDERS FOR ASSIGNMENT...`);
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('challenge_id', challenge.id);

    if (orders && orders.length > 0) {
        console.log(`✅ Found ${orders.length} related orders:`);
        orders.forEach(o => {
            console.log(`   - Order ID: ${o.id} | Status: ${o.status} | Created By: ${o.created_by || 'Unknown'}`);
            if (o.metadata) console.log(`     Metadata:`, JSON.stringify(o.metadata));
        });
    }

    console.log('\n===========================================\n');
}

findAccountCreator();
