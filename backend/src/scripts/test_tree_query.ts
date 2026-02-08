
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function test() {
    console.log("Testing Step 1: Fix Query Syntax");
    try {
        // Try `not.is.null`
        const { data: d1, error: e1 } = await supabase
            .from('profiles')
            .select('id')
            .or('referral_code.neq.null,referred_by.not.is.null')
            .limit(1);

        if (e1) console.log("Attempt 1 (not.is.null) Failed:", e1.message);
        else console.log("Attempt 1 (not.is.null) Success:", d1?.length);

    } catch (e: any) {
        console.error("Exception:", e);
    }
}

test();
