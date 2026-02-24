import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const orderId = 'SF1771942863217WH5988MZO';

    // 1. Check payment_orders table
    const { data: orderData, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    console.log("=== Payment Order ===");
    console.log(orderError ? orderError : orderData);

    // 2. Check webhook_logs (if exists) or system logs
    const { data: logsData, error: logsError } = await supabase
        .from('system_logs') // Adjust table name if you have a specific webhook log table
        .select('*')
        .ilike('message', `%${orderId}%`)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("\n=== System Logs ===");
    if (!logsError && logsData) {
        logsData.forEach(l => console.log(`[${l.created_at}] ${l.level}: ${l.message}`));
    } else {
        console.log(logsError || "No system logs found");
    }
}

main();
