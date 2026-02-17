
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'http://localhost:3001';
const RANDOM_EMAIL = `test-guest-${Math.random().toString(36).substring(7)}@example.com`;
const ORDER_ID = `SF-GUEST-${Date.now()}`;

async function main() {
    console.log(`🚀 Creating dummy order ${ORDER_ID} for email ${RANDOM_EMAIL}...`);

    // 1. Create dummy order in DB
    const { error: orderError } = await supabase.from('payment_orders').insert({
        order_id: ORDER_ID,
        amount: 100,
        currency: 'USD',
        status: 'pending',
        user_id: null, // Guest checkout
        metadata: {
            customerEmail: RANDOM_EMAIL,
            customerName: 'Guest Trader'
        },
        account_size: 10000,
        platform: 'MT5',
        model: 'lite',
        account_type_name: 'Lite 1-Step'
    });

    if (orderError) {
        console.error('❌ Failed to create order:', orderError.message);
        process.exit(1);
    }

    console.log('✅ Order created. Simulating webhook...');

    // 2. Simulate webhook
    const payload = {
        pid: 1430965607415808,
        data: JSON.stringify({
            cregis_id: `po${Date.now()}`,
            order_id: ORDER_ID,
            receive_amount: "100.00",
            receive_currency: "USDT",
            pay_amount: "100",
            pay_currency: "USDT",
            order_amount: "100",
            order_currency: "USD",
            status: "paid",
            payer_id: RANDOM_EMAIL,
            payer_name: "Guest Trader",
            payer_email: RANDOM_EMAIL,
            remark: `Order ${ORDER_ID}`
        }),
        sign: "dummy_sign",
        nonce: "LxtU4m",
        timestamp: Date.now(),
        event_name: "order",
        event_type: "paid"
    };

    try {
        const response = await fetch(`${BASE_URL}/api/webhooks/cregis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (text.includes('success":true') || text.includes('Process completed')) {
            console.log('\n✅ Webhook call successful!');

            // 3. Verify profile creation
            console.log('\n🔍 Verifying profile in DB...');
            const { data: profile, error: profFetchError } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', RANDOM_EMAIL)
                .maybeSingle();

            if (profFetchError) {
                console.error('❌ Error fetching profile:', profFetchError.message);
            } else if (profile) {
                console.log('✅ Profile found:', JSON.stringify(profile, null, 2));
                if (profile.metadata && profile.metadata.source === 'guest_checkout_webhook') {
                    console.log('✅ Profile metadata is correct!');
                } else {
                    console.warn('⚠️ Profile metadata is missing or incorrect.');
                }
            } else {
                console.log('❌ Profile NOT found in DB.');
            }
        } else {
            console.log('\n❌ Webhook call failed.');
        }

    } catch (error) {
        console.error(`Error reaching server:`, error);
    }
}

main();
