
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = 'VIVEKMISHRAGTA@GMAIL.COM';
    console.log(`Searching for orders and webhooks for: ${email}`);

    // 1. Search in profiles to get user_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', email)
        .maybeSingle();

    let orders: any[] = [];

    // 2. Search in payment_orders by user_id or metadata email
    if (profile) {
        console.log(`Found profile: ${profile.id}`);
        const { data: profileOrders } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('user_id', profile.id);
        if (profileOrders) orders = [...profileOrders];
    }

    // Also search by metadata email directly (for guest checkouts)
    const { data: guestOrders } = await supabase
        .from('payment_orders')
        .select('*')
        .filter('metadata->>customerEmail', 'ilike', email);
    
    if (guestOrders) {
        // Merge and avoid duplicates
        guestOrders.forEach(go => {
            if (!orders.find(o => o.order_id === go.order_id)) {
                orders.push(go);
            }
        });
    }

    if (orders.length === 0) {
        console.log("No orders found for this email.");
    } else {
        console.log(`Found ${orders.length} orders:`);
        for (const order of orders) {
            console.log("\n--- Order Details ---");
            console.log(JSON.stringify(order, null, 2));

            // 3. Search for related webhook logs
            const { data: webhooks } = await supabase
                .from('webhook_logs')
                .select('*')
                .eq('order_id', order.order_id);
            
            if (webhooks && webhooks.length > 0) {
                console.log(`Found ${webhooks.length} webhook logs:`);
                console.log(JSON.stringify(webhooks, null, 2));
            } else {
                console.log("No webhook logs found for this order.");
            }
        }
    }
}

main();
