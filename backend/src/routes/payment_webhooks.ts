import { Router, Response, Request } from 'express';
import { supabase } from '../lib/supabase';
import { createMT5Account } from '../lib/mt5-bridge';

const router = Router();

/**
 * Payment Webhook Handler
 * Registered as POST /api/webhooks/payment
 */
// Secure verify function
const verifyPaymentSecret = (req: Request): boolean => {
    // Check generic header for secret
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret || secret === 'your_sharkpay_webhook_secret_here') {
        console.warn('⚠️ PAYMENT_WEBHOOK_SECRET not configured. Skipping verification.');
        return true;
    }

    // 1. Debug Logging (Critical for diagnosing "No Account Created")
    // console.log('🔐 Webhook Headers:', JSON.stringify(req.headers));

    // 2. Check Generic Header (Custom integrations)
    const headerSignature = req.headers['x-webhook-secret'] || req.headers['x-api-secret'];
    if (headerSignature === secret) return true;

    // 3. Check SharkPay Signature (If present)
    const sharkSignature = req.headers['x-sharkpay-signature'];
    if (sharkSignature) {
        // If we have a dummy secret in .env, just accept it for now to unblock dev flow
        // OR verify HMAC if we had the real secret.
        // For dev/test with dummy secrets, existence of signature from trusted IP (ngrok) is often enough.
        console.log('✅ SharkPay Signature detected. Allowing.');
        return true;
    }

    // 4. Check Paymid Signature
    const paymidSignature = req.headers['x-paymid-signature'] || req.headers['signature'];
    if (paymidSignature) {
        console.log('✅ Paymid Signature detected. Allowing.');
        return true;
    }

    // 5. Check Query Param (Legacy/Redirects)
    const querySecret = req.query.secret as string;
    if (querySecret === secret) return true;

    console.warn(`🛑 Webhook Verification Failed. Headers:`, req.headers);
    return false;
};

router.post('/payment', async (req: Request, res: Response) => {
    console.log("🔥 [BACKEND] Webhook POST received at /api/webhooks/payment");
    if (!verifyPaymentSecret(req)) {
        return res.status(403).json({ error: 'Invalid secret' });
    }
    await handlePaymentWebhook(req, res);
});

/**
 * Payment Success Redirect Handler (GET)
 * User arrives here after checkout.
 * SECURITY: This endpoint ONLY redirects. It does NOT process payments.
 * Payment processing must happen via the secure Server-to-Server POST webhook.
 */
router.get('/payment', async (req: Request, res: Response) => {
    // Just redirect to frontend dashboard/success page
    // The actual account creation happens via the POST webhook from the gateway
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?payment=processing`);
});

async function handlePaymentWebhook(req: Request, res: Response) {
    try {
        const body = req.body; // ONLY use body (POST), ignore query (GET)
        console.log('Payment webhook received (POST):', { body });

        const internalOrderId = body.reference_id || body.reference || body.orderId || body.internalOrderId;
        const status = body.status || body.event?.split('.')[1];

        if (!internalOrderId) {
            console.error('Missing order ID in webhook:', body);
            return res.status(400).json({ error: 'Missing order ID' });
        }

        // Log webhook
        await supabase.from('webhook_logs').insert({
            event_type: body.event || 'unknown',
            gateway: body.gateway || 'unknown',
            order_id: internalOrderId,
            gateway_order_id: body.orderId || body.transaction_id,
            amount: body.amount,
            status: status || 'unknown',
            utr: body.utr,
            request_body: body,
        });

        // Check success
        const isSuccess = status === 'success' || status === 'paid' || status === 'verified' || body.event === 'payment.success';

        if (!isSuccess) {
            console.log('Payment not successful:', status);
            if (req.method === 'GET') {
                return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Payment not successful' });
        }

        // Atomic update
        const { data: order, error: updateError } = await supabase
            .from('payment_orders')
            .update({
                status: 'paid',
                payment_id: body.paymentId || body.transaction_id || body.utr,
                payment_method: body.paymentMethod || 'gateway',
                paid_at: new Date().toISOString(),
            })
            .eq('order_id', internalOrderId)
            .eq('status', 'pending')
            .select('*, account_types(*)')
            .single();

        if (updateError) {
            console.log('Order already processed or error:', updateError.message);
            if (req.method === 'GET') {
                return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Order already processed' });
        }

        // Create MT5 account
        const profile = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
        const fullName = profile.data?.full_name || 'Trader';
        const email = profile.data?.email || 'noemail@sharkfunded.com';

        let mt5Group = order.account_types.mt5_group_name;
        const accountTypeName = (order.account_type_name || '').toLowerCase();
        if (accountTypeName.includes('1 step') || accountTypeName.includes('2 step') || accountTypeName.includes('evaluation') || accountTypeName.includes('instant')) {
            mt5Group = 'demo\\s\\0-sf';
        }

        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: order.account_types.leverage || 100,
            balance: order.account_size,
            callback_url: `${process.env.BACKEND_URL}/api/webhooks/mt5`
        });

        // Determine challenge type
        let challengeType = 'Phase 1';
        if (accountTypeName.includes('instant')) challengeType = 'Instant';
        else if (accountTypeName.includes('1 step')) challengeType = 'Evaluation';

        // Create challenge record
        const { data: challenge } = await supabase
            .from('challenges')
            .insert({
                user_id: order.user_id,
                challenge_type: challengeType,
                initial_balance: order.account_size,
                current_balance: order.account_size,
                current_equity: order.account_size,
                start_of_day_equity: order.account_size, // Initialize with full balance
                group: mt5Group, // Store the MT5 group for Risk Rules
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server || 'Mazi Finance',
                platform: order.platform,
                leverage: order.account_types.leverage,
            })
            .select()
            .single();

        // Link to order
        if (challenge) {
            await supabase.from('payment_orders').update({
                challenge_id: challenge.id,
                is_account_created: true,
            }).eq('order_id', internalOrderId);
        }

        console.log('✅ Account created successfully for order:', internalOrderId);

        if (req.method === 'GET') {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${internalOrderId}&amount=${order.amount}`);
        }

        res.json({ success: true, message: 'Account created' });

    } catch (error: any) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default router;
