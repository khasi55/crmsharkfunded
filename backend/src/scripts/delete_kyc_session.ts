
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

async function deleteKycSession(email: string) {
    console.log(`🚀 Starting KYC session removal for: ${email}`);

    // 1. Find User ID
    const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, kyc_status')
        .eq('email', email)
        .single();

    if (userError || !userData) {
        console.error("❌ User not found:", userError?.message);
        return;
    }

    const userId = userData.id;
    console.log(`✅ User Found: ${userId} (${userData.full_name})`);
    console.log(`Current KYC Status: ${userData.kyc_status}`);

    // 2. Delete KYC Sessions
    console.log(`🗑️ Deleting KYC sessions for user ${userId}...`);
    const { data: deleteData, error: deleteError } = await supabase
        .from('kyc_sessions')
        .delete()
        .eq('user_id', userId);

    if (deleteError) {
        console.error("❌ Error deleting KYC sessions:", deleteError.message);
        return;
    }

    console.log(`✅ KYC sessions deleted.`);

    // 3. Reset Profile KYC Status
    console.log(`🔄 Resetting kyc_status to 'not_started' for user ${userId}...`);
    const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'not_started' })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) {
        console.error("❌ Error resetting KYC status:", updateError.message);
        return;
    }

    console.log(`✅ KYC status reset successfully to: ${updateData.kyc_status}`);
    console.log(`✨ DONE! The user ${email} can now restart their KYC process.`);
}

deleteKycSession('siddareddy1947@gmail.com');
