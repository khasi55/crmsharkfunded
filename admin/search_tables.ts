import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const userId = '87df6658-c969-495a-8f0e-5ca195d9f781';

    // Check 'wallets' table if it exists
    const { data: wallets, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);

    if (!walletError) {
        console.log("Wallets found:", wallets);
    } else {
        console.log("Wallets table error (likely doesn't exist):", walletError.message);
    }

    // Check 'payout_methods' or similar
    const { data: payoutMethods, error: pmError } = await supabase
        .from('payout_methods') // Guessing
        .select('*')
        .eq('user_id', userId);
    if (!pmError) console.log("Payout Methods:", payoutMethods);

    // Check 'user_payment_details' or similar
    const { data: upd, error: updError } = await supabase
        .from('user_payment_details') // Guessing
        .select('*')
        .eq('user_id', userId);
    if (!updError) console.log("User Payment Details:", upd);

    // List all tables to see what we have
    const { data: tables, error: tablesError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

    if (tables) {
        console.log("Existing Tables:", tables.map(t => t.tablename).join(', '));
    }
}

main();
