
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const WEBHOOK_URL = 'http://localhost:3001/api/webhooks/payment';
const SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'your_sharkpay_webhook_secret_here';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateWebhook() {
    console.log('🚀 Simulating Payment Webhook...');

    const orderId = `SF-ORDER-SIM-${Date.now()}`;
    const amount = 100;

    // Fetch user
    const { data: user } = await supabase.from('profiles').select('id, email').eq('email', 'wavavis888@hopesx.com').single();
    if (!user) { console.error('User not found'); return; }

    console.log(`👤 User: ${user.id}`);

    // Fetch an account type
    const { data: accType } = await supabase.from('account_types').select('id').limit(1).single();
    if (!accType) { console.error('No account types found'); return; }

    // Create Order
    const { error: insertError } = await supabase.from('payment_orders').insert({
        user_id: user.id,
        order_id: orderId,
        amount: amount,
        status: 'pending',
        currency: 'USD',
        payment_gateway: 'simulation',
        account_type_name: 'Simulation Account',
        account_type_id: accType.id, // Use valid FK
        metadata: { type: 'simulation' },
        account_size: 5000,
        platform: 'MT5',
        model: 'challenge'
    });

    if (insertError) {
        console.error('❌ Insert Failed:', insertError);
        return;
    }
    console.log(`📝 Order ${orderId} inserted.`);

    // Verify Read
    const { data: check } = await supabase.from('payment_orders').select('status').eq('order_id', orderId).single();
    console.log(`   Read Check: ${check ? 'Found' : 'NOT FOUND'} (Status: ${check?.status})`);

    // WEBHOOK CALL
    const payload = {
        event: 'payment.success',
        reference_id: orderId,
        transaction_id: `TXN-${Date.now()}`,
        status: 'paid',
        amount: amount,
        gateway: 'sharkpay'
    };

    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json', 'x-webhook-secret': SECRET }
        });
        console.log('✅ Webhook Response:', response.status, response.data);
    } catch (error: any) {
        console.error('❌ Webhook Request Failed:', error.message);
        if (error.response) console.error('   Data:', error.response.data);
    }

    // CHECK FINAL STATE
    await new Promise(r => setTimeout(r, 2000)); // Wait for async processing
    const { data: final } = await supabase.from('payment_orders').select('status').eq('order_id', orderId).single();
    console.log(`🏁 Final Order Status: ${final?.status}`);

    const { data: comms } = await supabase.from('affiliate_earnings').select('*').contains('metadata', { order_id: orderId });
    if (comms && comms.length > 0) {
        console.log('🎉 SUCCESS: Commission Created!', comms[0].amount);
    } else {
        console.log('❌ FAILURE: No Commission Found.');
    }
}

simulateWebhook();
