
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

async function findUserAndKyc(email: string) {
    console.log(`🔍 Searching for user: ${email}`);

    // 1. Find User ID
    const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

    if (userError || !userData) {
        console.error("❌ User not found:", userError?.message);
        return;
    }

    console.log(`✅ User Found: ${userData.id} (${userData.full_name})`);

    // 2. Find KYC Session with manual_document_url
    const { data: kycData, error: kycError } = await supabase
        .from('kyc_sessions')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

    if (kycError) {
        console.error("❌ Error fetching KYC data:", kycError.message);
        return;
    }

    if (!kycData || kycData.length === 0) {
        console.log("⚠️ No KYC sessions found for this user.");
    } else {
        console.log(`Found ${kycData.length} KYC sessions.`);
        kycData.forEach((session, index) => {
            console.log(`\nSession #${index + 1}:`);
            console.log(`ID: ${session.id}`);
            console.log(`Status: ${session.status}`);
            console.log(`Didit Session ID: ${session.didit_session_id}`);
            console.log(`Manual Document URL: ${session.manual_document_url}`);

            if (session.raw_response) {
                console.log("Raw Response:", session.raw_response);
            }
        });
    }
}

findUserAndKyc('novembermoon28072000@gmail.com');
