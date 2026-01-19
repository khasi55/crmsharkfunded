
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function unbreach() {
    console.log("Unbreaching 889224209...");
    const { error } = await supabase
        .from('challenges')
        .update({
            status: 'active',
            current_equity: 100000,
            current_balance: 100000,
            // also clear violation logs? Optional, but good for cleanup.
        })
        .eq('login', 889224209);

    if (error) console.error("Error:", error);
    else console.log("✅ Account 889224209 Unbreached and Reset to 100k.");
}

unbreach();
