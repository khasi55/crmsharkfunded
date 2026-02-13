
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { createMT5Account } from '../src/lib/mt5-bridge';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_ORDER_ID = 'SF-ORDER-1770203368464-d4a366e1';

async function run() {
    console.log(`🚀 Starting manual assignment for Order: ${TARGET_ORDER_ID}`);

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*, account_types(*)')
        .eq('order_id', TARGET_ORDER_ID)
        .maybeSingle();

    if (orderError || !order) {
        console.error('❌ Order not found:', orderError);
        return;
    }
    console.log(`✅ Order found. User: ${order.user_id}, Amount: ${order.amount}, Plan: ${order.account_type_name}`);

    if (order.is_account_created) {
        console.log('⚠️ Account already marked as created for this order.');
        // Optional: Continue anyway if user wants to force retry
    }

    // 2. Fetch Profile
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
    const fullName = profile?.full_name || 'Trader';
    const email = profile?.email || 'noemail@sharkfunded.com';

    // 3. Logic to determine params (Copied from webhooks.ts)
    const accountTypeName = (order.account_type_name || '').toLowerCase();

    // Check if competition
    const isCompetition = order.model === 'competition' ||
        (order.metadata && order.metadata.type === 'competition') ||
        order.metadata?.is_competition ||
        String(TARGET_ORDER_ID).startsWith('SF-COMP');

    let mt5Group = 'demo\\forex';
    if (order.account_types?.mt5_group_name) {
        mt5Group = order.account_types.mt5_group_name;
    }

    let leverage = 100;
    if (isCompetition) {
        leverage = 100;
        mt5Group = 'demo\\SF\\0-Demo\\comp';
    }

    console.log(`🏗️ Creating MT5 Account:`);
    console.log(`   Name: ${fullName}`);
    console.log(`   Group: ${mt5Group}`);
    console.log(`   Leverage: ${leverage}`);
    console.log(`   Balance: ${order.account_size}`);

    try {
        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: leverage,
            balance: order.account_size,
            callback_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/webhooks/mt5`
        });

        console.log('✅ MT5 Account Created successfully!');
        console.log('   Login:', mt5Data.login);

        // 4. DB Insert - Challenge
        let challengeType = 'Phase 1';
        if (isCompetition) {
            challengeType = 'Competition';
        } else if (accountTypeName.includes('instant')) {
            challengeType = 'Instant';
        } else if (accountTypeName.includes('1 step')) {
            challengeType = 'Evaluation';
        }

        const { data: challenge, error: chalError } = await supabase
            .from('challenges')
            .insert({
                user_id: order.user_id,
                challenge_type: challengeType,
                initial_balance: order.account_size,
                current_balance: order.account_size,
                current_equity: order.account_size,
                start_of_day_equity: order.account_size,
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server || 'ALFX Limited',
                platform: order.platform,
                leverage: leverage,
                group: mt5Group,
                metadata: order.metadata || {},
            })
            .select()
            .single();

        if (chalError) {
            console.error('❌ Challenge Insert Failed:', chalError);
            return;
        }
        console.log('✅ Challenge Record Inserted ID:', challenge.id);

        // 5. Update Order
        const { error: updateError } = await supabase.from('payment_orders').update({
            challenge_id: challenge.id,
            is_account_created: true,
        }).eq('order_id', TARGET_ORDER_ID);

        if (updateError) console.error('❌ Failed to update order status:', updateError);
        else console.log('✅ Order updated as processed.');

    } catch (err: any) {
        console.error('❌ Failed to create account:', err.message);
        if (err.message.includes('MT_RET_ERR_NETWORK')) {
            console.log('\n💡 TIP: Use "createMT5Account" logic check. Ensure Bridge URL in .env is reachable.');
        }
    }
}

run();
