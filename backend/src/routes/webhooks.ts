import { Router, Response, Request } from 'express';
import { supabase } from '../lib/supabase';
import { createMT5Account } from '../lib/mt5-bridge';

const router = Router();

// POST /api/webhooks/mt5
// Receives pushed trades from Python bridge
// POST /api/webhooks/mt5
// Receives pushed trades from Python bridge
router.post('/mt5', async (req: Request, res: Response) => {
    // Security Check: Verify Shared Secret
    const authorizedSecret = process.env.MT5_WEBHOOK_SECRET;
    const receivedSecret = req.headers['x-mt5-secret'];

    if (authorizedSecret && authorizedSecret !== 'your_mt5_webhook_secret_here' && receivedSecret !== authorizedSecret) {
        console.warn(`🛑 Blocked unauthorized MT5 webhook attempt from ${req.ip}`);
        res.status(403).json({ error: 'Unauthorized: Invalid MT5 Secret' });
        return;
    }
    try {
        const { login, trades } = req.body;

        if (!login || !trades) {
            res.status(400).json({ error: 'Missing login or trades' });
            return;
        }

        // PHASE 4 EVENT-DRIVEN ARCHITECTURE
        // Instead of processing everything here (slow), we publish the event to Redis.
        // The Worker will handle DB upsert and Risk Checks.

        const { redis } = await import('../lib/redis');

        const eventData = {
            login,
            trades,
            timestamp: Date.now()
        };

        // Publish to 'events:trade_update' channel
        await redis.publish('events:trade_update', JSON.stringify(eventData));

        // Respond immediately (High Performance)
        res.json({ success: true, queued: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Payment Webhook Handler (POST)
 * Called by gateway to notify success
 */
router.post('/payment', async (req: Request, res: Response) => {
    await handlePaymentWebhook(req, res);
});

/**
 * Payment Redirection Handler (GET)
 * User arrives here after checkout
 */
router.get('/payment', async (req: Request, res: Response) => {
    await handlePaymentWebhook(req, res);
});

async function handlePaymentWebhook(req: Request, res: Response) {
    try {
        const body = req.method === 'GET' ? req.query : req.body;
        console.log('💰 Payment webhook/redirect received:', { method: req.method, body });

        const internalOrderId = body.reference_id || body.reference || body.orderId || body.internalOrderId;
        const status = body.status || body.event?.split('.')[1];
        const frontendUrl = process.env.FRONTEND_URL;

        if (!internalOrderId) {
            console.error('❌ Missing order ID in webhook:', body);
            if (req.method === 'GET') return res.redirect(`${frontendUrl}/dashboard`);
            return res.status(400).json({ error: 'Missing order ID' });
        }

        // 1. Log webhook for audit
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

        // 2. Determine Success
        const isSuccess = status === 'success' || status === 'paid' || status === 'verified' || body.event === 'payment.success';

        if (!isSuccess) {
            console.log('⚠️ Payment not successful:', status);
            if (req.method === 'GET') {
                return res.redirect(`${frontendUrl}/payment/failed?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Payment not successful' });
        }

        // 3. Status Update (Atomic)
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
            // Already processed
            if (req.method === 'GET') {
                return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Order already processed or not found' });
        }

        // 4. Create MT5 Account via Bridge
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
        const fullName = profile?.full_name || 'Trader';
        const email = profile?.email || 'noemail@sharkfunded.com';

        let mt5Group = 'demo\\Pro-Platinum'; // Default fallback
        let leverage = 100;

        if (order.account_types) {
            mt5Group = order.account_types.mt5_group_name;
            leverage = order.account_types.leverage;
        }

        const accountTypeName = (order.account_type_name || '').toLowerCase();
        const isCompetition = order.model === 'competition' || (order.metadata && order.metadata.type === 'competition');

        // Use correct group for each type
        if (isCompetition) {
            mt5Group = 'demo\\Pro-Platinum';
            leverage = 100; // Competition leverage
        } else if (accountTypeName.includes('1 step') || accountTypeName.includes('2 step') || accountTypeName.includes('evaluation') || accountTypeName.includes('instant')) {
            mt5Group = 'demo\\Pro-Platinum';
        }

        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: leverage,
            balance: order.account_size,
            callback_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/webhooks/mt5`
        });

        // 5. Create Challenge Record & Competition Participant
        let challengeType = 'Phase 1';
        if (isCompetition) challengeType = 'Competition';
        else if (accountTypeName.includes('instant')) challengeType = 'Instant';
        else if (accountTypeName.includes('1 step')) challengeType = 'Evaluation';

        const { data: challenge } = await supabase
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
                server: mt5Data.server || 'Mazi Finance',
                platform: order.platform,
                leverage: leverage,
                metadata: isCompetition ? { competition_id: order.metadata.competition_id } : {},
            })
            .select()
            .single();

        // If competition, also add to participants table
        if (isCompetition && challenge) {
            await supabase.from('competition_participants').insert({
                competition_id: order.metadata.competition_id,
                user_id: order.user_id,
                status: 'active',
                challenge_id: challenge.id
            });
            console.log('✅ Competition participant registered');
        }

        // 6. Finalize Order
        if (challenge) {
            await supabase.from('payment_orders').update({
                challenge_id: challenge.id,
                is_account_created: true,
            }).eq('order_id', internalOrderId);
        }

        console.log('✅ Success: Challenge created for order', internalOrderId);

        // 7. Success Redirect
        if (req.method === 'GET') {
            return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}&amount=${order.amount}`);
        }

        res.json({ success: true, message: 'Process completed' });

    } catch (error: any) {
        console.error('❌ Payment Webhook Error:', error);
        if (req.method === 'GET') {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
        }
        res.status(500).json({ error: 'Internal processing error' });
    }
}

export default router;
