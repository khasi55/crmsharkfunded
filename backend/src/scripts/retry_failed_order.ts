
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function retry() {
    const orderId = 'SFORD177055825712486b414df';
    console.log(`🚀 Retrying processing for order: ${orderId}`);

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*, account_types(*)')
        .eq('order_id', orderId)
        .single();

    if (orderError || !order) {
        console.error('❌ Failed to fetch order:', orderError?.message || 'Not found');
        return;
    }

    if (order.is_account_created) {
        console.log('✅ Account already marked as created for this order.');
        return;
    }

    // 2. Map Challenge Type (Using new logic)
    let challengeType = 'evaluation';
    const model = (order.model || '').toLowerCase();
    const type = (order.metadata?.type || '').toLowerCase();

    if (model && type) {
        const normalizedType = type.replace('-', '_').replace(' ', '_');
        challengeType = `${model}_${normalizedType}`;
    } else {
        const rawName = (order.account_type_name || '').toLowerCase();
        if (rawName.includes('lite')) {
            if (rawName.includes('instant')) challengeType = 'lite_instant';
            else if (rawName.includes('1 step')) challengeType = 'lite_1_step';
            else if (rawName.includes('2 step')) challengeType = 'lite_2_step_phase_1';
        } else if (rawName.includes('prime')) {
            if (rawName.includes('instant')) challengeType = 'prime_instant';
            else if (rawName.includes('1 step')) challengeType = 'prime_1_step';
            else if (rawName.includes('2 step')) challengeType = 'prime_2_step_phase_1';
        }
    }

    console.log(`🏷️ Mapped "${order.account_type_name}" to "${challengeType}"`);

    // 3. IMPORTANT: We need the LOGIN that was already created!
    // Since we can't easily find it automatically, let's look for any recent challenge with NO order link?
    // Actually, the user might have the login in their logs.
    // For now, I'll allow the script to take a login as argument if provided.

    const login = process.argv[2];
    if (!login) {
        console.error('❌ Error: Please provide the MT5 Login ID from your logs as an argument.');
        console.log('Example: npx ts-node retry_order.ts 900909490707');
        return;
    }

    console.log(`🔨 Creating challenge for Login: ${login}...`);

    // 4. Insert Challenge
    const mt5Group = order.metadata?.mt5_group || "demo\\S\\1-SF";
    const leverage = order.metadata?.leverage || 100;

    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
            user_id: order.user_id,
            challenge_type: challengeType,
            initial_balance: order.account_size,
            current_balance: order.account_size,
            current_equity: order.account_size,
            start_of_day_equity: order.account_size,
            status: 'active',
            login: Number(login),
            master_password: 'CheckEmail', // We don't have the real password, user has it in email
            investor_password: '',
            server: 'ALFX Limited',
            platform: order.platform,
            leverage: leverage,
            group: mt5Group,
            metadata: order.metadata || {},
        })
        .select()
        .single();

    if (challengeError) {
        console.error('❌ Challenge Insert Failed:', challengeError.message);
        return;
    }

    // 5. Link to Order
    const { error: finalError } = await supabase
        .from('payment_orders')
        .update({
            challenge_id: challenge.id,
            is_account_created: true,
        })
        .eq('order_id', orderId);

    if (finalError) {
        console.error('❌ Final Update Failed:', finalError.message);
    } else {
        console.log('🎉 SUCCESS! Order recovered and challenge created.');
    }
}

retry();
