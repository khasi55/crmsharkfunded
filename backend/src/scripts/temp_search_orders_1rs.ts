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
    console.log("Searching for orders with amount 1 or similar...");

    const { data: orders, error } = await supabase
        .from('payment_orders')
        .select('*')
        .or('amount.eq.1,amount.eq.0.01,amount.eq.84') // 84 rs is approx 1 USD
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log("No orders found with amount 1.");
    } else {
        console.log(`Found ${orders.length} orders with amount 1:`);
        orders.forEach(o => {
            console.log(`- ${o.order_id}: ${o.amount} ${o.currency} (${o.status}) - User: ${o.user_id} - ${o.created_at}`);
        });
    }
    
    console.log("\nSearching for any order for Vivek Mishra in the last hour...");
    const { data: recentOrders } = await supabase
        .from('payment_orders')
        .select('*, profiles(email)')
        .gt('created_at', new Date(Date.now() - 3600000).toISOString());
        
    if (recentOrders) {
        recentOrders.forEach(o => {
            console.log(`- ${o.order_id}: ${o.amount} ${o.currency} (${o.status}) - Email: ${o.profiles?.email} - ${o.created_at}`);
        });
    }
}

main();
