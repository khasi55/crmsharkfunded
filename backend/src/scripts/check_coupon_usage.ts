
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log("Checking Coupon Usage in Payment Orders...");
    const { data: orders, error } = await supabase
        .from('payment_orders')
        .select('order_id, user_id, coupon_code, status')
        .not('coupon_code', 'is', null)
        .limit(10);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${orders?.length} orders with coupons.`);
        orders?.forEach(o => {
            console.log(`Order: ${o.order_id}, User: ${o.user_id}, Code: ${o.coupon_code}`);
        });
    }
}

check();
