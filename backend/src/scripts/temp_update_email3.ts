import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function directSqlUpdate() {
    const userId = "35ac13a4-fc0d-4e53-9efe-60474bbc370f";
    const newEmail = 'Kunthuwealth3004@gmail.com';

    console.log(`Executing raw SQL to update auth.users...`);

    // We can use the rpc capability if we have one, or just supabase.rpc
    // Let's check if there's an RPC we can use, or we just try a raw update via postgres connection

    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: `UPDATE auth.users SET email = '${newEmail}' WHERE id = '${userId}';`
    });

    if (error) {
        console.error("RPC execute_sql failed:", error.message);

        // Let's try another common one
        const { error: rpcError2 } = await supabase.rpc('run_sql', {
            query: `UPDATE auth.users SET email = '${newEmail}' WHERE id = '${userId}';`
        });

        if (rpcError2) {
            console.log("Could not update via typical RPCs. We'll need a pg client or another approach.");
            console.log(rpcError2.message);
        } else {
            console.log("Updated via run_sql");
        }
    } else {
        console.log("Updated via execute_sql");
    }
}

directSqlUpdate();
