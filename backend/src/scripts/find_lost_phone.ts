import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'kssniazi@gmail.com';
    console.log(`Aggressively searching for phone number for ${email} in all possible locations...\n`);

    // 1. Check Auth Users Metadata
    console.log("=== 1. Checking auth.users ===");
    let page = 1;
    let foundAuthUser: any = null;
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !users || !users.length) break;
        foundAuthUser = users.find((u: any) => u.email === email);
        if (foundAuthUser) break;
        page++;
    }

    if (foundAuthUser) {
        console.log(`Found Auth User! ID: ${foundAuthUser.id}`);
        console.log("Raw Meta Data:", JSON.stringify(foundAuthUser.user_metadata, null, 2));
        if (foundAuthUser.user_metadata?.phone || foundAuthUser.user_metadata?.phone_number) {
            console.log("🔥 SUCCESS! Found phone in auth user metadata!");
        }
    } else {
        console.log("Auth user not found.");
    }

    // 2. Check Payment Orders Metadata
    console.log("\n=== 2. Checking payment_orders metadata ===");
    const { data: orders } = await supabase.from('payment_orders').select('*').ilike('metadata->>email', `%${email}%`);
    const { data: orders3 } = await supabase.from('payment_orders').select('*').eq('user_id', foundAuthUser?.id);

    const allOrders = [...(orders || []), ...(orders3 || [])];
    const uniqueOrders = Array.from(new Map(allOrders.filter(o => o).map(item => [item.id, item])).values());

    if (uniqueOrders.length > 0) {
        console.log(`Found ${uniqueOrders.length} orders.`);
        for (const o of uniqueOrders) {
            console.log(`\nOrder: ${o.order_id}`);
            console.log("Creation Date:", o.created_at);
            console.log("Order MetaData:", JSON.stringify(o.metadata, null, 2));
            if (o.metadata?.phone || o.metadata?.phone_number || o.metadata?.customerPhone) {
                console.log("🔥 SUCCESS! Found phone in order metadata!");
            }
        }
    } else {
        console.log("No orders found via standard query.");
    }

    // 3. Check Webhook Logs using raw string search
    console.log("\n=== 3. Checking webhook_logs ===");
    console.log("Doing a wide search in webhook logs for the email string...");
    const { data: wildLogs } = await supabase.from('webhook_logs').select('*').textSearch('request_body', `'${email}'`);

    if (wildLogs && wildLogs.length > 0) {
        console.log(`Found ${wildLogs.length} logs by text search.`);
        wildLogs.forEach(l => {
            console.log(`Log ID: ${l.id}, Date: ${l.created_at}`);
            console.log("Payload:", JSON.stringify(l.request_body, null, 2));
        });
    } else {
        // Fallback to fetch all recent logs and find it in memory if text search fails
        const { data: recentLogs } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(200);
        let foundInMem = false;
        if (recentLogs) {
            for (const log of recentLogs) {
                const str = JSON.stringify(log.request_body);
                if (str.includes('kssniazi')) {
                    console.log(`Found in recent log ID: ${log.id}, Date: ${log.created_at}`);
                    console.log("Payload:", JSON.stringify(log.request_body, null, 2));
                    foundInMem = true;
                }
            }
        }
        if (!foundInMem) {
            console.log("No webhook logs found with this email at all.");
        }
    }
}

main().catch(console.error);
