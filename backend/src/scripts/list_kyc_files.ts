
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findFilesForUser(email: string) {
    console.log(`🔍 Searching for files for user: ${email}...`);

    // 1. Find User ID
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email);

    if (userError) console.error("Error finding user:", userError.message);
    if (!users || users.length === 0) {
        console.log("❌ No user found.");
        return;
    }

    console.log(`Found ${users.length} user(s).`);

    for (const user of users) {
        console.log(`\nUser: ${user.email} (${user.id})`);

        // 2. Find KYC Sessions
        const { data: sessions } = await supabase
            .from('kyc_sessions')
            .select('*')
            .eq('user_id', user.id);

        if (!sessions || sessions.length === 0) {
            console.log("  No KYC sessions.");
            continue;
        }

        for (const session of sessions) {
            console.log(`  Session ID: ${session.id} (Didit: ${session.didit_session_id}, Status: ${session.status})`);

            // Check bucket
            const bucketPath = `kyc/${session.id}`;
            console.log(`    Checking storage path: ${bucketPath}...`);

            const { data: files, error: listError } = await supabase
                .storage
                .from('kyc-documents')
                .list(bucketPath);

            if (listError) {
                console.error("    ❌ Error listing files:", listError.message);
            } else if (files && files.length > 0) {
                console.log(`    ✅ Found ${files.length} file(s):`);
                files.forEach(f => {
                    console.log(`      - ${f.name} (${f.metadata?.mimetype})`);
                });
            } else {
                console.log("    ⚠️ No files found in storage.");
            }
        }
    }
}

findFilesForUser('novembermoon28072000@gmail.com');
