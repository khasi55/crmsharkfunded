
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function addUniqueConstraint() {
    console.log("🛠️ Adding UNIQUE constraint on 'user_id' for 'wallet_addresses' table...");

    const sql = `
        ALTER TABLE wallet_addresses
        ADD CONSTRAINT wallet_addresses_user_id_key UNIQUE (user_id);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error("❌ SQL Execution Failed:", error);
        // Fallback: Try raw query if RPC fails (it might, if exec_sql isn't there)
        // Since we know exec_sql failed before, check if we can rely on standard migration approach
        console.log("⚠️ RPC exec_sql missing. Please run the following SQL manually in Supabase:");
        console.log(sql);
    } else {
        console.log("✅ Constraint added successfully!");
    }
}

addUniqueConstraint();
