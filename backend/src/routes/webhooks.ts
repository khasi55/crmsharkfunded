import { Router, Response, Request } from 'express';
import { supabase } from '../lib/supabase';
import { createMT5Account } from '../lib/mt5-bridge';
import { EmailService } from '../services/email-service';
import fs from 'fs';
import path from 'path';

const router = Router();

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

        const { getRedis } = await import('../lib/redis');

        const eventData = {
            login,
            trades,
            timestamp: Date.now()
        };

        // Publish to 'events:trade_update' channel
        await getRedis().publish('events:trade_update', JSON.stringify(eventData));

        // Respond immediately (High Performance)
        res.json({ success: true, queued: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Secure verify function
const verifyPaymentSecret = (req: Request): boolean => {
    // ⚠️ EMERGENCY BYPASS: Always return true as requested by USER
    // We still log diagnostics to help fix the secret mismatch later
    console.log(`🔓 [EMERGENCY BYPASS] Allowing webhook from IP: ${req.ip}`);

    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const forwarded = req.headers['forwarded'] as string;
    const sigMatch = forwarded?.match(/sig=([^;]+)/);

    console.warn(`[Webhook Diagnostic] Bypass active. Forwarded Sig: ${sigMatch ? 'YES' : 'NO'}, Secret Configured: ${secret ? 'YES' : 'NO'}`);

    return true;
};

/**
 * Payment Webhook Handler (POST)
 * Called by gateway to notify success
 */
router.post('/payment', async (req: Request, res: Response) => {
    console.log(`🔐 Verifying POST Webhook from ${req.ip}`);
    if (!verifyPaymentSecret(req)) {
        console.warn(`🛑 Blocked unauthorized Payment Webhook POST from ${req.ip}`);
        return res.status(403).json({ error: 'Unauthorized: Invalid Secret' });
    }
    await handlePaymentWebhook(req, res);
});

/**
 * Payment Redirection Handler (GET)
 * User arrives here after checkout
 */
router.get('/payment', async (req: Request, res: Response) => {
    // For GET redirects, we usually just want to send them to the frontend
    // We SHOULD NOT process the order here unless signed.

    // Check if signed (unlikely for standard redirects)
    if (verifyPaymentSecret(req)) {
        await handlePaymentWebhook(req, res);
    } else {
        // Safe Fallback: Redirect to Frontend "Processing" or "Success" page
        // The Frontend will poll for the "is_account_created" status from the API

        const internalOrderId = req.query.reference_id as string ||
            req.query.reference as string ||
            req.query.orderId as string ||
            req.query.orderID as string ||
            req.query.orderid as string;
        const statusParam = req.query.status as string;
        // Use consistent Frontend URL logic
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.sharkfunded.com';

        if (internalOrderId) {
            if (statusParam === 'failed') {
                return res.redirect(`${frontendUrl}/payment/failed?orderId=${internalOrderId}`);
            }
            return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}&check_status=true`);
        }
        return res.redirect(`${frontendUrl}/dashboard`);
    }
});

async function handlePaymentWebhook(req: Request, res: Response) {
    try {
        const body = req.method === 'GET' ? req.query : req.body;

        // Helper to find value in object (case-insensitive and deep scan for EPay)
        const getPayloadValue = (obj: any, keys: string[]) => {
            if (!obj || typeof obj !== 'object') return null;
            for (const key of keys) {
                // 1. Direct match
                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                // 2. Case-insensitive match
                for (const k in obj) {
                    if (k.toLowerCase() === key.toLowerCase() && obj[k] !== undefined && obj[k] !== null) return obj[k];
                }
            }
            return null;
        };

        const internalOrderId = getPayloadValue(body, ['reference_id', 'reference', 'orderid', 'orderId', 'internalOrderId']);
        const status = getPayloadValue(body, ['status', 'transt', 'transactionStatus']);
        const amount = getPayloadValue(body, ['amount', 'tranmt', 'receive_amount', 'orderAmount']);

        console.log(`💰 [Payment Webhook] Parsed: ID=${internalOrderId}, Status=${status}, Amount=${amount}, Method=${req.method}`);

        // Use consistent Frontend URL logic
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.sharkfunded.com';

        if (!internalOrderId) {
            console.error('❌ Missing order ID in webhook. BodyKeys:', Object.keys(body), 'Body:', body);
            if (req.method === 'GET') return res.redirect(`${frontendUrl}/dashboard`);
            return res.status(400).json({ error: 'Missing order ID' });
        }

        // 1. Log webhook for audit
        await supabase.from('webhook_logs').insert({
            event_type: body.event || 'unknown',
            gateway: body.gateway || (body.mid ? 'epay' : 'unknown'),
            order_id: internalOrderId,
            gateway_order_id: body.transactionid || body.transaction_id || body.orderId || body.orderid,
            amount: amount,
            status: status || 'unknown',
            utr: body.utr,
            request_body: body,
        });

        // 2. Determine Success
        const statusLower = String(status || '').toLowerCase();
        const isSuccess =
            statusLower === 'success' ||
            statusLower === 'paid' ||
            statusLower === 'verified' ||
            statusLower === 'purchased' ||
            statusLower === 'payment accepted' ||
            body.event === 'payment.success';

        if (!isSuccess) {
            console.log('⚠️ Payment not successful:', status);
            if (req.method === 'GET') {
                return res.redirect(`${frontendUrl}/payment/failed?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Payment not successful' });
        }

        // 3. Status Update (Atomic)
        console.log(`💰 [Payment] Updating order ${internalOrderId} to paid...`);
        const { data: order, error: updateError } = await supabase
            .from('payment_orders')
            .update({
                status: 'paid',
                payment_id: body.paymentId || body.transaction_id || body.utr,
                payment_method: body.paymentMethod || 'gateway',
                paid_at: new Date().toISOString(),
            })
            .eq('order_id', internalOrderId)
            // .eq('status', 'pending') // REMOVED: Allow processing even if already paid just in case
            .select('*, account_types(*)')
            .single();

        if (updateError) {
            console.error(`❌ [Payment] Order update error for ${internalOrderId}:`, updateError.message);
            // If it's just not found or something else, return
            if (!updateError.message.includes('multiple rows')) {
                if (req.method === 'GET') {
                    return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}`);
                }
                return res.json({ message: 'Order update failed or already handled' });
            }
        }

        const finalOrder = order;
        if (!finalOrder) {
            console.error(`❌ [Payment] Could not find order ${internalOrderId} after update attempt.`);
            return res.status(404).json({ error: 'Order not found' });
        }

        console.log(`✅ [Payment] Order ${internalOrderId} is now PAID. Triggering commission check...`);

        // ---------------------------------------------------------
        // AFFILIATE COMMISSION LOGIC
        // ---------------------------------------------------------
        try {
            console.log(`📣 [Affiliate] Processing commission for Order: ${finalOrder.order_id}`);
            await processAffiliateCommission(finalOrder.user_id, finalOrder.amount, finalOrder.order_id);
        } catch (affError) {
            console.error('⚠️ [Affiliate] Failed to process affiliate commission:', affError);
        }
        // ---------------------------------------------------------

        // 4. Create MT5 Account via Bridge
        console.log(`🏗️ [Payment] Creating MT5 account for user ${finalOrder.user_id}...`);
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', finalOrder.user_id).single();

        const fullName = profile?.full_name || 'Trader';
        const email = profile?.email || 'noemail@sharkfunded.com';

        const accountTypeName = (order.account_type_name || '').toLowerCase();
        const isCompetition = order.model === 'competition' || (order.metadata && order.metadata.type === 'competition');

        // TRUST DB GROUP (User Request)
        let mt5Group = 'demo\\forex'; // Default fallback
        if (order.account_types?.mt5_group_name) {
            mt5Group = order.account_types.mt5_group_name;
        }

        let leverage = 100;
        if (isCompetition) {
            leverage = 100;
            mt5Group = 'demo\\SF\\0-Demo\\comp'; // FORCE Override for Competitions
        } else if (order.metadata && order.metadata.is_competition) {
            mt5Group = 'demo\\SF\\0-Demo\\comp';
        }

        // Double check via Order ID pattern
        if (String(internalOrderId).startsWith('SF-COMP') || String(internalOrderId).startsWith('SFCOM')) {
            mt5Group = 'demo\\SF\\0-Demo\\comp';
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
        // 5. Determine Valid Challenge Type (Must match database constraint)
        let challengeType = 'evaluation'; // Default fallback
        const model = (order.model || '').toLowerCase();
        const type = (order.metadata?.type || '').toLowerCase();

        if (isCompetition) {
            challengeType = 'competition';
        } else if (model && type) {
            // Map common patterns to snake_case (e.g. Model: 'lite', Type: '1-step' -> 'lite_1_step')
            const normalizedType = type.replace('-', '_').replace(' ', '_');
            challengeType = `${model}_${normalizedType}`;
        } else {
            // Fallback for older orders or manual creations
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

        console.log(`🏷️ [Payment] Mapping challenge type: "${order.account_type_name}" -> "${challengeType}"`);

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
                server: mt5Data.server || 'ALFX Limited',
                platform: order.platform,
                leverage: leverage,
                group: mt5Group, // Store actual used group
                metadata: order.metadata || {}, // Pass through all metadata (including competition details)
            })
            .select()
            .single();

        // If competition, also add to participants table
        if (isCompetition && challenge && order.metadata?.competition_id) {
            await supabase.from('competition_participants').insert({
                competition_id: order.metadata.competition_id,
                user_id: order.user_id,
                status: 'active',
                challenge_id: challenge.id
            });
        }

        // 6. Finalize Order
        if (challenge) {
            await supabase.from('payment_orders').update({
                challenge_id: challenge.id,
                is_account_created: true,
            }).eq('order_id', internalOrderId);
        }



        // 7. Send Emails (Credentials & Welcome)
        if (email) {


            // If Competition, send "Joined" email
            if (isCompetition) {
                await EmailService.sendCompetitionJoined(
                    email,
                    fullName,
                    order.metadata?.competition_title || 'Trading Competition'
                ).catch((e: any) => console.error('Failed to send comp joined email:', e));
            }

            // Always send Credentials
            await EmailService.sendAccountCredentials(
                email,
                fullName,
                String(mt5Data.login),
                mt5Data.password,
                mt5Data.server || 'ALFX Limited',
                mt5Data.investor_password
            ).catch((e: any) => console.error('Failed to send credentials email:', e));
        }

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

async function processAffiliateCommission(userId: string, amount: number, orderId: string) {
    const logFile = '/tmp/debug_hooks.log';
    const log = (msg: string) => {
        try {
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
        } catch (e) { }
    };

    log(`🚀 START processAffiliateCommission: User ${userId}, Order ${orderId}, Amount ${amount}`);
    console.log(`🚀 [Affiliate] START: User ${userId}, Order ${orderId}`);

    // 0. Check if commission already exists for this order to avoid duplicates
    const { data: existingComm } = await supabase
        .from('affiliate_earnings')
        .select('id')
        .contains('metadata', { order_id: orderId })
        .maybeSingle();

    if (existingComm) {
        log(`ℹ️ Commission already exists for order ${orderId}. Skipping duplicate.`);
        console.log(`ℹ️ [Affiliate] Commission already exists for order ${orderId}. Skipping.`);
        return;
    }
    const { data: orderData } = await supabase
        .from('payment_orders')
        .select('metadata')
        .eq('order_id', orderId)
        .single();

    let referrerId = orderData?.metadata?.affiliate_id;

    if (!referrerId) {
        // Fallback to profile referral
        const { data: profile } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', userId)
            .single();

        referrerId = profile?.referred_by;
    }

    if (!referrerId) {
        log(`ℹ️ No referrer for user ${userId}`);
        console.log(`ℹ️ [Affiliate] No referrer found for user ${userId}.`);
        return;
    }

    log(`✅ Referrer found: ${referrerId}`);
    console.log(`✅ [Affiliate] Referrer found: ${referrerId}`);

    // 2. Calculate Commission (Prioritize custom rate from coupon, fallback to 7% flat)
    const commissionRate = orderData?.metadata?.commission_rate !== undefined && orderData?.metadata?.commission_rate !== null
        ? Number(orderData.metadata.commission_rate) / 100
        : 0.07;

    const commissionAmount = Number((amount * commissionRate).toFixed(2));
    log(`💰 Commission Rate: ${commissionRate * 100}%, Amount: ${commissionAmount}`);
    console.log(`💰 [Affiliate] Rate: ${commissionRate * 100}%, Amount: $${commissionAmount}`);

    if (commissionAmount <= 0) {
        log('⚠️ Commission amount is 0 or negative. Skipping.');
        return;
    }

    // 3. Insert Earnings Record
    const { error, data: newRec } = await supabase.from('affiliate_earnings').insert({
        referrer_id: referrerId,
        referred_user_id: userId,
        amount: commissionAmount,
        commission_type: 'purchase',
        status: 'pending',
        metadata: {
            order_id: orderId,
            order_amount: amount,
            rate: commissionRate,
            is_custom_rate: commissionRate !== 0.07
        }
    }).select().single();

    if (error) {
        log(`Insert Error: ${error.message}`);
        console.error(' Failed to insert affiliate earnings:', error);
        return;
    }
    log(`✅ Commission inserted: ${newRec?.id}`);

    // 4. Update Profile Totals
    const { error: rpcError } = await supabase.rpc('increment_affiliate_commission', {
        p_user_id: referrerId,
        p_amount: commissionAmount
    });

    if (rpcError) {
        log(`RPC Error: ${rpcError.message}`);
        console.error(`[Affiliate] RPC Error updating profile:`, rpcError.message);
    } else {
        log(`RPC Success`);
        console.log(`[Affiliate] Successfully updated profile totals.`);
    }
}
