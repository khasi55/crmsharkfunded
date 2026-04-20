import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkEverything() {
    const userId = '6f9f4a8a-75c6-40ab-a1dd-2870d81ea43a';
    console.log(`Checking ALL tables for user ID: ${userId}`);
    
    const tables = ['challenges', 'payout_requests', 'transactions', 'orders', 'kyc_verifications'];
    
    for (const table of tables) {
        process.stdout.write(`Checking '${table}'... `);
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            console.log(`Error: ${error.message} (might not exist)`);
        } else {
            console.log(`Found ${data.length} records.`);
        }
    }
}

checkEverything();
