import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testQuery() {
    const { data, error } = await supabase
        .from('affiliate_earnings')
        .select(`
            id,
            amount,
            status,
            created_at,
            referrer:profiles!referrer_id(full_name, email),
            referred:profiles!referred_user_id(full_name, email)
        `)
        .limit(1);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Data:", JSON.stringify(data, null, 2));
    }
}
testQuery();
