
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
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log("Usage: npx ts-node src/scripts/manual_assign_order.ts <ORDER_ID> <LOGIN> <PASSWORD> [INVESTOR_PW]");
        process.exit(1);
    }

    const orderId = args[0];
    const login = parseInt(args[1]);
    const password = args[2];
    const investorPassword = args[3] || '';

    if (isNaN(login)) {
        console.error("Invalid Login ID");
        process.exit(1);
    }

    console.log(`🚀 Manually assigning Account ${login} to Order ${orderId}...`);

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (orderError || !order) {
        console.error("❌ Order not found:", orderError);
        return;
    }

    if (order.is_account_created) {
        console.log("⚠️ Order already has an account created. Checking...");
        if (order.challenge_id) {
            console.log(`   Linked Challenge ID: ${order.challenge_id}`);
            return;
        }
    }

    console.log(`Values: User ${order.user_id}, Plan: ${order.account_type_name}, Amount: ${order.amount}`);

    // 2. Prepare Challenge Data
    const accountTypeName = (order.account_type_name || '').toLowerCase();

    // Determine Challenge Type
    let challengeType = 'Phase 1';
    if (order.model === 'competition' || (order.metadata && order.metadata.type === 'competition')) {
        challengeType = 'Competition';
    } else if (accountTypeName.includes('instant')) {
        challengeType = 'Instant'; // Based on "Instant Funding Pro"
    } else if (accountTypeName.includes('1 step')) {
        challengeType = 'Evaluation';
    }

    // Leverage & Group from Metadata or Defaults
    const leverage = order.metadata?.leverage || 100;
    const group = order.metadata?.mt5_group || 'demo\\SF\\0-Pro';

    const challengeData = {
        user_id: order.user_id,
        challenge_type: challengeType,
        initial_balance: order.account_size,
        current_balance: order.account_size,
        current_equity: order.account_size,
        start_of_day_equity: order.account_size,
        status: 'active',
        login: login,
        master_password: password,
        investor_password: investorPassword,
        server: 'ALFX Limited', // Default
        platform: 'mt5',
        leverage: leverage,
        group: group,
        metadata: order.metadata || {},
    };

    console.log("Creating Challenge Record:", challengeData);

    // 3. Insert Challenge
    const { data: challenge, error: insertError } = await supabase
        .from('challenges')
        .insert(challengeData)
        .select()
        .single();

    if (insertError) {
        console.error("❌ Failed to create challenge:", insertError);
        return;
    }

    console.log(`✅ Challenge Created: ${challenge.id}`);

    // 4. Update Order
    const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
            challenge_id: challenge.id,
            is_account_created: true,
        })
        .eq('order_id', orderId);

    if (updateError) {
        console.error("❌ Failed to update order:", updateError);
    } else {
        console.log("✅ Order updated successfully.");
    }
}

main();
