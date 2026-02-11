
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; // Add default
// Check if SUPABASE_URL exists if NEXT_PUBLIC_SUPABASE_URL is missing
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

const LOGIN = 900909491661;

async function findAccountCreator() {
    console.log(`\n=== FINDING CREATOR FOR ACCOUNT ${LOGIN} ===\n`);

    // 1. Find the challenge (account)
    // Query challenges table for the login
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

    // Check metadata
    if (challenge.metadata) {
        console.log(`   Metadata:`, JSON.stringify(challenge.metadata, null, 2));
    }

    // 2. Find the user profile who owns this account
    if (challenge.user_id) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*') // Select all columns to see if there's anything else useful
            .eq('id', challenge.user_id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
        } else if (profile) {
            console.log(`\n👤 OWNER DETAILS (User ID: ${challenge.user_id}):`);
            console.log(`   Full Name: ${profile.full_name}`);
            console.log(`   Email: ${profile.email}`);
            console.log(`   Role: ${profile.role}`); // Assuming role exists, if not it will be undefined
            console.log(`   Created At: ${profile.created_at}`);
        } else {
            console.log(`\n❌ Profile for User ID ${challenge.user_id} NOT FOUND.`);
        }
    } else {
        console.log(`\n⚠️ Account has NO User ID linked to it.`);
    }

    console.log('\n===========================================\n');
}

findAccountCreator();
