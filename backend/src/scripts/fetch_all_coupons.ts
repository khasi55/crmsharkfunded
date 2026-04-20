import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Fetching ALL coupons...');
    const { data: coupons, error } = await supabase
        .from('discount_coupons')
        .select('*');

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("All Coupons:", JSON.stringify(coupons, null, 2));
    }
}
check();
