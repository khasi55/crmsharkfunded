import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = "onlyy8631@gmail.com";
    console.log(`Searching for user: ${email}`);

    const { data: user, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error("Error searching user:", error);
        return;
    }

    if (!user) {
        console.log("User not found in profiles table.");
        return;
    }

    console.log("User found:", user);

    const bankData = {
        user_id: user.id,
        account_holder_name: "MITHAPARA CHETANBHAI MANJIBHAI",
        bank_name: "Bank of India (Vinchhiya)", // Including branch in bank name as per schema
        account_number: "313320110000272",
        ifsc_code: "BKID0003133",
        is_locked: false
    };

    console.log("Upserting bank_details...");
    const { data: updated, error: updateError } = await supabase
        .from('bank_details')
        .upsert(bankData, { onConflict: 'user_id' })
        .select();

    if (updateError) {
        console.error("Error updating bank details:", updateError);
    } else {
        console.log("Bank details updated successfully:", updated);
    }
}

main();
