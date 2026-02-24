import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'kssniazi@gmail.com';
    console.log(`Searching for email ${email}...`);

    const { data: profiles } = await supabase.from('profiles').select('*').ilike('email', email);
    console.log("Profiles:", profiles);

    const { data: tx } = await supabase.from('transactions').select('*').ilike('email', email);

    if (tx && tx.length > 0) {
        tx.forEach(t => {
            console.log("\nTransaction ID:", t.id);
            console.log("Metadata:", JSON.stringify(t.metadata, null, 2));
        });
    } else {
        console.log("No transactions found with this email.");
    }
}
main();
