import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Searching for email:', 'gojiyanayan9@email.com');

    // 1. Find user in auth.users or public.profiles
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', 'gojiyanayan9@email.com');

    if (profileErr) {
        console.error('Error fetching profile:', profileErr.message);
        return;
    }
    
    if (!profiles || profiles.length === 0) {
        console.error('Profile not found for this email.');
        return;
    }

    const userId = profiles[0].id;
    console.log(`Found User ID: ${userId} (${profiles[0].full_name || 'No Name'})`);

    // 2. Fetch recent orders for this user
    const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (ordersErr) {
        console.error('Error fetching orders:', ordersErr.message);
        return;
    }

    console.log(`Found ${orders?.length || 0} recent orders.`);
    
    if (orders && orders.length > 0) {
        orders.forEach((o, i) => {
            console.log(`\n--- Order ${i+1} ---`);
            console.log(`Order ID: ${o.id}`);
            console.log(`Status: ${o.status}`);
            console.log(`Total Price: ${o.total_price}`);
            console.log(`Created At: ${new Date(o.created_at).toLocaleString()}`);
            console.log(`Payment Details:`, o);
        });
        
        console.log('\n--- Checking Webhook Logs ---');
        // Let's check webhook logs for these orders if a table exists
        const orderIds = orders.map(o => o.id);
        const { data: logs, error: logsErr } = await supabase
            .from('webhook_logs') // guessing the table name based on scripts
            .select('*')
            .in('order_id', orderIds)
            .order('created_at', { ascending: false });
            
        if (!logsErr && logs) {
            console.log(`Found ${logs.length} webhook logs for these orders.`);
            logs.forEach(l => console.log(l.id, l.gateway, l.status, l.created_at, l.payload));
        } else {
             console.log('No webhook_logs table or no logs found.');
        }

    } else {
        console.log('No orders found.');
    }
}

main().catch(console.error);
