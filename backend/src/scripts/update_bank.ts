import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function updateBankAndLock(email: string, fullName: string, bankName: string, accountNumber: string, ifscCode: string) {
    console.log(`Searching for profile with email: ${email}`);

    // 1. Find the user
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email.trim());

    if (profileErr || !profiles || profiles.length === 0) {
        console.error("Profile not found or error:", profileErr?.message);
        return;
    }

    const user = profiles[0];
    console.log(`Found user: ${user.id} (${user.full_name})`);

    // 2. Upsert bank details and lock them
    const bankDetails = {
        user_id: user.id,
        account_holder_name: fullName,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        is_locked: true, // Lock the bank details
        updated_at: new Date().toISOString()
    };

    const { error: bankErr } = await supabase
        .from('bank_details')
        .upsert(bankDetails, { onConflict: 'user_id' });

    if (bankErr) {
        console.error("Failed to update bank details:", bankErr.message);
    } else {
        console.log(`✅ Bank details updated and locked successfully for ${email}!`);
    }
}

updateBankAndLock(
    'khansomnath2002@gmail.com',
    'Somnath Khan',
    'India Post Payments Bank',
    '063410080863',
    'IPOS0000001'
);
