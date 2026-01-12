
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestOrder() {
    console.log("🔍 Checking latest payment order...");

    const { data, error } = await supabase
        .from('payment_orders')
        .select(`
            id, 
            order_id, 
            status, 
            amount, 
            is_account_created, 
            challenge_id, 
            created_at,
            metadata,
            account_types ( mt5_group_name )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("❌ Error fetching order:", error);
        return;
    }

    if (!data) {
        console.log("⚠️ No orders found.");
        return;
    }

    console.log("\n📊 Latest Order Status:");
    console.log(`-------------`);
    console.log(`ID: ${data.order_id}`);
    console.log(`Time: ${new Date(data.created_at).toLocaleString()}`);
    console.log(`Amount: $${data.amount}`);
    console.log(`Status: ${data.status.toUpperCase()} ${data.status === 'paid' ? '✅' : '⏳'}`);
    console.log(`Account Created: ${data.is_account_created ? 'YES ✅' : 'NO ❌'}`);

    if (data.challenge_id) {
        console.log(`Challenge ID: ${data.challenge_id}`);
        // Fetch Challenge details
        const { data: challenge } = await supabase
            .from('challenges')
            .select('login, status, group')
            .eq('id', data.challenge_id)
            .single();

        if (challenge) {
            console.log(`MT5 Login: ${challenge.login}`);
            console.log(`MT5 Group: ${challenge.group}`);
            console.log(`Challenge Status: ${challenge.status}`);
        }
    }
    if (data.account_types) {
        // @ts-ignore
        console.log(`Target MT5 Group (DB): ${data.account_types.mt5_group_name}`);
    }
    console.log(`-------------\n`);
}

checkLatestOrder();
