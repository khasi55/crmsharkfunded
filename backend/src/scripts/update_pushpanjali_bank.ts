import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function updateBank() {
    const email = 'Pushpanjali84090@gmail.com';
    const newAccountNumber = '50100710487901';

    console.log(`🔍 Updating bank account for: ${email}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

    if (!profile) {
        console.error('❌ Profile not found.');
        return;
    }

    console.log(`✅ Profile found: ${profile.id}`);

    const { error: updateErr } = await supabase
        .from('bank_details')
        .update({ account_number: newAccountNumber, updated_at: new Date().toISOString() })
        .eq('user_id', profile.id);

    if (updateErr) {
        console.error("❌ Failed to update bank details:", updateErr.message);
    } else {
        console.log(`✅ Bank account number updated to ${newAccountNumber} for ${email}!`);
    }
}

updateBank();
