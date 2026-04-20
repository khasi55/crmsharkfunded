
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function approveKyc(email: string) {
    console.log(`🔍 Searching for user: ${email}`);

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

    const now = new Date().toISOString();
    const { data: updateData, error: updateError } = await supabase
        .from('kyc_sessions')
        .update({
            status: 'approved',
            approved_at: now,
            completed_at: now,
            updated_at: now
        })
        .eq('user_id', userData.id);

    if (updateError) {
        console.error("❌ Error updating KYC session:", updateError.message);
        return;
    }

    console.log(`✅ Successfully marked KYC as approved for ${email}`);
}

approveKyc('siddareddy1947@gmail.com');
