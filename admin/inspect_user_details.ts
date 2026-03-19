import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = 'faizanmalik2032@gmail.com';
    console.log(`Searching for user with email: ${email}`);

    // 1. Find user in profiles
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (profileError) {
        console.error("Profile Error:", profileError);
    } else {
        console.log("Profile found:", profile.id, profile.email);
        const userId = profile.id;

        // 2. Check bank_details
        const { data: bankDetails, error: bankError } = await supabase
            .from('bank_details')
            .select('*')
            .eq('user_id', userId);

        if (bankError) {
            console.error("Bank Details Error:", bankError);
        } else {
            console.log("Bank Details:", JSON.stringify(bankDetails, null, 2));
        }

        // 3. Check for wallet addresses
        const { data: wallets, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId);

        if (!walletError) {
            console.log("Wallets:", JSON.stringify(wallets, null, 2));
        } else {
            const { data: profilesWallet, error: profileWalletError } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', userId)
                .single();
            if (!profileWalletError) {
                console.log("Profile Wallet Address:", profilesWallet);
            }
        }
    }
}

main();
