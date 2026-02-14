
import { createClient } from '@supabase/supabase-js';
import { createMT5Account } from '../src/lib/mt5-bridge';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Force API Key if not loaded correctly
if (!process.env.MT5_API_KEY) {
    process.env.MT5_API_KEY = 'sk_live_mt5_bridge_2026_secure_key_v1_xK9mP4nQ7wL2sR8tY3vB6cJ1hF5gD0zA';
}

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORDER_ID = 'SF1771056865268A2TVR5D55';
const USER_EMAIL = 'anilbarwalanu160@gmail.com';

async function main() {
    console.log(`🚀 Starting Manual Fulfillment for Order: ${ORDER_ID}`);
    console.log(`👤 User Email: ${USER_EMAIL}`);

    // 1. Get or Create User
    console.log('🔍 Checking for user...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    let userId = users?.find(u => u.email === USER_EMAIL)?.id;

    if (!userId) {
        console.log('User not found. Creating user...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: USER_EMAIL,
            email_confirm: true,
            user_metadata: { full_name: 'Anil Barwal' } // Infer name from email if needed, or placeholder
        });

        if (createError) {
            console.error('Failed to create user:', createError);
            process.exit(1);
        }
        userId = newUser.user!.id;
        console.log(`✅ User created: ${userId}`);
    } else {
        console.log(`✅ User found: ${userId}`);
    }

    // 2. Initial Wait for Trigger (Profile Creation)
    await new Promise(r => setTimeout(r, 2000));

    // 3. Get Order
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', ORDER_ID)
        .single();

    if (orderError || !order) {
        console.error('Order not found:', orderError);
        process.exit(1);
    }

    // 4. Update Order User ID
    await supabase.from('payment_orders').update({ user_id: userId }).eq('order_id', ORDER_ID);
    console.log('✅ Order linked to user.');

    // 5. Create MAIN Account
    console.log('🏗️ Creating Main Account...');

    // Determine Group & Leverage
    let mt5Group = order.metadata?.mt5_group || 'demo\\forex';
    // Fallback based on order type if metadata missing
    if (!order.metadata?.mt5_group) {
        if (order.account_type_name.includes('lite')) mt5Group = 'demo\\S\\0-SF'; // Approximation based on viewed data
    }

    const leverage = 100;
    const balance = order.account_size;
    const challengeType = 'lite_instant'; // Hardcoded for this specific order type 'lite instant'

    const mainAccount = await createMT5Account({
        name: 'Anil Barwal',
        email: USER_EMAIL,
        group: mt5Group,
        leverage,
        balance,
        callback_url: `${process.env.BACKEND_URL}/api/webhooks/mt5`
    }) as any;

    if (!mainAccount || !mainAccount.login) {
        console.error('Failed to create main MT5 account');
        process.exit(1);
    }
    console.log(`✅ Main Account Created: ${mainAccount.login}`);

    // Insert Main Challenge
    const { data: challenge } = await supabase.from('challenges').insert({
        user_id: userId,
        challenge_type: challengeType,
        initial_balance: balance,
        current_balance: balance,
        current_equity: balance,
        start_of_day_equity: balance,
        status: 'active',
        login: mainAccount.login,
        master_password: mainAccount.password,
        investor_password: mainAccount.investor_password,
        server: mainAccount.server || 'ALFX Limited',
        platform: order.platform || 'MT5',
        leverage,
        group: mt5Group,
        metadata: order.metadata || {}
    }).select().single();

    if (!challenge) {
        console.error('Failed to insert main challenge');
    } else {
        console.log(`✅ Main Challenge ID: ${challenge.id}`);
        // Update Order
        await supabase.from('payment_orders').update({
            challenge_id: challenge.id,
            is_account_created: true // We can set this true now
        }).eq('order_id', ORDER_ID);
    }

    // 6. Create BOGO Account
    console.log('🎁 Creating BOGO Account...');
    const bogoMetadata = {
        ...(order.metadata || {}),
        is_bogo_free: true,
        parent_order_id: ORDER_ID
    };

    const bogoAccount = await createMT5Account({
        name: 'Anil Barwal',
        email: USER_EMAIL,
        group: mt5Group,
        leverage,
        balance,
        callback_url: `${process.env.BACKEND_URL}/api/webhooks/mt5`
    }) as any;

    if (!bogoAccount || !bogoAccount.login) {
        console.error('Failed to create BOGO MT5 account');
    } else {
        console.log(`✅ BOGO Account Created: ${bogoAccount.login}`);

        await supabase.from('challenges').insert({
            user_id: userId,
            challenge_type: challengeType,
            initial_balance: balance,
            current_balance: balance,
            current_equity: balance,
            start_of_day_equity: balance,
            status: 'active',
            login: bogoAccount.login,
            master_password: bogoAccount.password,
            investor_password: bogoAccount.investor_password,
            server: bogoAccount.server || 'ALFX Limited',
            platform: order.platform || 'MT5',
            leverage,
            group: mt5Group,
            metadata: bogoMetadata
        });
        console.log('✅ BOGO Challenge Inserted');
    }

    console.log('🎉 Fulfillment Complete!');
}

main().catch(console.error);
