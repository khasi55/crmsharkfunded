import { Router, Response, Request } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { createMT5Account } from '../lib/mt5-bridge';
import { EmailService } from '../services/email-service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { paymentGatewayRegistry } from '../services/payment-gateways';

const router = Router();

router.post('/mt5', async (req: Request, res: Response) => {
    // Security Check: Verify Shared Secret
    const authorizedSecret = process.env.MT5_WEBHOOK_SECRET;
    const receivedSecret = req.headers['x-mt5-secret'] || req.headers['x-webhook-secret'];

    if (authorizedSecret && authorizedSecret !== 'your_mt5_webhook_secret_here' && receivedSecret !== authorizedSecret) {
        console.warn(`🛑 Blocked unauthorized MT5 webhook attempt from ${req.ip}`);
        res.status(403).json({ error: 'Unauthorized: Invalid MT5 Secret' });
        return;
    }
    try {
        const { login, trades, event } = req.body;

        // Use a more relaxed check: allow payload if it has trades OR a status event
        if (!login || (!trades && !event)) {
            res.status(400).json({ error: 'Missing login or trades/event' });
            return;
        }

        // PHASE 4 EVENT-DRIVEN ARCHITECTURE
        // Instead of processing everything here (slow), we publish the event to Redis.
        // The Worker will handle DB upsert and Risk Checks.

        const { getRedis } = await import('../lib/redis');

        const eventData = {
            login,
            trades: trades || [], // Fallback to empty array if status update
            event: event || 'trade_update', // Default to trade_update
            timestamp: Date.now(),
            ...req.body // Pass through all bridge metadata (equity, balance, reason, etc.)
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

const verifyPaymentSecret = (req: Request): boolean => {
    // 🛡️ Global Security Check: Use for unknown gateways or as a baseline
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn('⚠️ No PAYMENT_WEBHOOK_SECRET configured. Security is degraded.');
        return process.env.NODE_ENV === 'development'; // Allow only in dev if secret is missing
    }

    const signature = req.headers['x-payment-signature'] || req.headers['x-hub-signature-256'];
    if (!signature) return false;

    try {
        const hmac = crypto.createHmac('sha256', webhookSecret);
        const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expected = hmac.update(bodyStr).digest('hex');
        
        // Handle 'sha256=' prefix if present (common in webhooks)
        const received = String(signature).replace('sha256=', '');
        
        const receivedBuf = Buffer.from(received);
        const expectedBuf = Buffer.from(expected);
        
        if (receivedBuf.length !== expectedBuf.length) return false;
        
        return crypto.timingSafeEqual(receivedBuf, expectedBuf);
    } catch (e) {
        return false;
    }
};

router.post('/payment', async (req: Request, res: Response) => {
    // 🛡️ Log Entry
    const logEntry = `[${new Date().toISOString()}] POST /api/webhooks/payment - RAW - From: ${req.ip}\n`;
    fs.appendFileSync('backend_request_debug.log', logEntry);

    // Ensure we have a body
    if (!req.body || Object.keys(req.body).length === 0) {
        console.warn('[Webhook] Received empty body on /payment');
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

/**
 * Cregis Webhook Handler
 */
router.post('/cregis', async (req: Request, res: Response) => {
    // DEBUG: Log Headers to diagnose Content-Type mismatch
    console.log('[Webhook] Cregis Headers:', JSON.stringify(req.headers));

    // FORCE PARSE: If body is empty, try to read stream (handling text/plain or other types)
    if (!req.body || Object.keys(req.body).length === 0) {
        try {
            const rawBody = await new Promise<string>((resolve, reject) => {
                let data = '';
                req.setEncoding('utf8');
                req.on('data', chunk => data += chunk);
                req.on('end', () => resolve(data));
                req.on('error', err => reject(err));
            });

            if (rawBody) {
                console.log('[Webhook] Cregis Raw Body Captured:', rawBody);
                try {
                    req.body = JSON.parse(rawBody);
                } catch (e) {
                    console.warn('[Webhook] Failed to JSON parse raw body:', e);
                    // attempt query string parse if JSON fails?
                    // req.body = require('querystring').parse(rawBody);
                }
            } else {
                console.warn('[Webhook] Cregis Body is truly empty.');
            }
        } catch (e) {
            console.error('[Webhook] Error reading stream:', e);
        }
    }

    console.log('[Webhook] Cregis Event (Parsed):', JSON.stringify(req.body));

    // Verify Cregis Signature
    try {
        const { paymentGatewayRegistry } = await import('../services/payment-gateways');
        const cregis = paymentGatewayRegistry.getGateway('cregis');
        
        if (cregis) {
            const isValid = await cregis.verifyWebhook(req.headers, req.body);
            if (isValid) {
                console.log('[Webhook] Cregis signature status verified.');
                req.body.verified_by_preprocessor = true;
            }
        } else {
            console.error('[Webhook] Cregis gateway not found in registry');
            return res.status(500).json({ error: 'Gateway not found' });
        }
    } catch (verError) {
        console.error('[Webhook] Cregis verification error:', verError);
        return res.status(500).json({ error: 'Internal Error: Cregis Verification' });
    }

    // Adapt Cregis payload to internal structure expected by handlePaymentWebhook
    // Cregis sends: third_party_id (OrderId), status (1=success), amount

    // Mutate req.body to match what handlePaymentWebhook looks for
    if (req.body) {
        // Flatten nested 'data' object if present (Cregis V2 structure)
        if (req.body.data) {
            let data = req.body.data;

            // Fix: Cregis sends 'data' as a JSON string, not an object
            if (typeof data === 'string') {
                try {
                    console.log('[Webhook] Cregis: Parsing stringified data field');
                    data = JSON.parse(data);
                } catch (e) {
                    console.warn('[Webhook] Failed to parse Cregis data string:', e);
                }
            }

            if (typeof data === 'object') {
                console.log('[Webhook] Cregis: Flattening nested data object');
                req.body.order_id = data.order_id || req.body.order_id;
                req.body.amount = data.order_amount || data.amount || req.body.amount;
                // Map status from data if present
                if (data.status) req.body.status = data.status;
                // Map transaction ID
                req.body.transaction_id = data.cregis_id || data.payment_id;
            }
        }

        req.body.reference_id = req.body.third_party_id || req.body.order_id;

        const rawStatus = String(req.body.status || '').toLowerCase();
        req.body.status = (req.body.status == 1 || rawStatus === 'paid' || rawStatus === 'success' || req.body.payment_status === 'paid' || rawStatus === 'paid_over' || req.body.event_type === 'paid_over') ? 'success' : 'failed';

        req.body.gateway = 'cregis';
        req.body.transaction_id = req.body.transaction_id || req.body.order_id || req.body.payment_id; // Cregis Order ID

        // Map amount if needed (cregis might send 'order_amount' or 'amount')
        if (!req.body.amount && req.body.order_amount) req.body.amount = req.body.order_amount;
    }

    await handlePaymentWebhook(req, res);
});

async function handlePaymentWebhook(req: Request, res: Response) {
    try {
        // Merge query and body params for robust payload checking (gateways like SharkPay send 'gateway' in query)
        const body = { ...req.body, ...req.query };
        
        // 🔍 DEEP DEBUG: Log the parsed body and query to see why gateway is missing
        console.log(`[Webhook Debug] Raw Query:`, JSON.stringify(req.query));
        console.log(`[Webhook Debug] Raw Body:`, JSON.stringify(req.body));
        console.log(`[Webhook Debug] Merged Payload Keys:`, Object.keys(body));

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

        const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
        const gatewayName = getPayloadValue(body, ['gateway']) || 
                           (userAgent.includes('sharkfunded-callback') ? 'sharkpay' : 
                           (body.mid ? 'epay' : 'unknown'));
        
        const internalOrderId = getPayloadValue(body, ['reference_id', 'reference', 'orderid', 'orderId', 'internalOrderId', 'order_id']);
        const status = getPayloadValue(body, ['status', 'transt', 'transactionStatus']);
        const amount = getPayloadValue(body, ['amount', 'tranmt', 'receive_amount', 'orderAmount']);

        // 🛡️ SIGNATURE VERIFICATION
        let gateway;
        try {
            gateway = paymentGatewayRegistry.getGateway(gatewayName);
            console.log(`[Webhook Debug] Gateway identified: ${gatewayName}, Instance found: ${!!gateway}`);
        } catch (registryError) {
            console.error('[Webhook Error] Failed to retrieve gateway from registry:', registryError);
            return res.status(500).json({ error: 'Internal Error: Gateway Registry Failure' });
        }
        
        // Skip verification if already done by a pre-processor (like Cregis)
        if (body.verified_by_preprocessor) {
            console.log(`[Webhook] Skipping secondary verification for ${gatewayName} (already verified)`);
        } else if (gateway) {
            try {
                const isValid = await gateway.verifyWebhook(req.headers, body);
                if (!isValid) {
                    console.error(`🛑 [Webhook] Unauthorized ${gatewayName} webhook attempt for order ${internalOrderId} from ${req.ip}`);
                    return res.status(401).json({ error: 'Unauthorized: Invalid Signature' });
                }
                console.log(`✅ [Webhook] ${gatewayName} signature verified for order ${internalOrderId}`);
            } catch (verifyError) {
                console.error(`[Webhook Error] Verification failed for ${gatewayName}:`, verifyError);
                return res.status(500).json({ error: 'Internal Error: Verification Logic Failure' });
            }
        } else {
            console.warn(`⚠️ [Webhook] Unknown gateway ${gatewayName}. Proceeding with baseline verification.`);
            try {
                if (!verifyPaymentSecret(req)) {
                   console.error(`🛑 [Webhook] Global signature verification failed for unknown gateway ${gatewayName}`);
                   return res.status(401).json({ error: 'Unauthorized: Invalid Global Signature' });
                }
            } catch (globalVerifyError) {
                console.error('[Webhook Error] Global verification failed:', globalVerifyError);
                return res.status(500).json({ error: 'Internal Error: Global Verification Failure' });
            }
        }

        // Use consistent Frontend URL logic
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.sharkfunded.com';

        if (!internalOrderId) {
            console.error('❌ Missing order ID in webhook. BodyKeys:', Object.keys(body), 'Body:', body);
            if (req.method === 'GET') return res.redirect(`${frontendUrl}/dashboard`);
            return res.status(400).json({ error: 'Missing order ID' });
        }

        // 1. Log webhook for audit
        await supabaseAdmin.from('webhook_logs').insert({
            event_type: body.event || body.event_type || 'unknown',
            gateway: gatewayName,
            order_id: internalOrderId,
            gateway_order_id: body.transactionid || body.transaction_id || body.orderId || body.orderid || body.cregis_id,
            amount: amount,
            status: status || 'unknown',
            utr: body.utr,
            request_body: body,
        });

        // 2. Fetch existing order to preserve metadata
        const { data: existingOrder, error: fetchError } = await supabaseAdmin
            .from('payment_orders')
            .select('*')
            .eq('order_id', internalOrderId)
            .single();

        if (fetchError || !existingOrder) {
            console.error(`❌ [Payment] Order not found for ${internalOrderId}`);
            if (req.method === 'GET') return res.redirect(`${frontendUrl}/dashboard`);
            return res.status(404).json({ error: 'Order not found' });
        }

        // 3. Determine Success
        const statusLower = String(status || '').toLowerCase();
        const isSuccess =
            statusLower === 'success' ||
            statusLower === 'paid' ||
            statusLower === 'paid_over' ||
            statusLower === 'verified' ||
            statusLower === 'purchased' ||
            statusLower === 'payment accepted' ||
            body.event === 'payment.success';

        if (!isSuccess) {
            console.log('⚠️ Payment not successful:', status);

            // Preserve existing metadata during update
            await supabaseAdmin.from('payment_orders')
                .update({ 
                    status: 'failed', 
                    metadata: { 
                        ...(existingOrder.metadata || {}), 
                        ...body, 
                        failure_reason: status 
                    } 
                })
                .eq('order_id', internalOrderId);

            if (req.method === 'GET') {
                return res.redirect(`${frontendUrl}/payment/failed?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Payment not successful' });
        }

        // 3. Status Update (Atomic)

        // Fetch order already handled above

            // 🛡️ SECURITY FIX: Currency-Aware Underpayment Validation
        let receivedAmount = Number(amount);
        const expectedAmount = Number(existingOrder.amount);
        const orderCurrency = (existingOrder.currency || 'USD').toUpperCase();
        
        // Convert received amount to USD if gateway is SharkPay (which sends INR)
        if (gatewayName === 'sharkpay' && orderCurrency === 'USD') {
            const USD_TO_INR = 98; // Sync with sharkpay.ts
            receivedAmount = receivedAmount / USD_TO_INR;
            console.log(`[Webhook API] Converted SharkPay INR ${amount} to USD ${receivedAmount.toFixed(2)}`);
        }

        if (isNaN(receivedAmount) || isNaN(expectedAmount) || (receivedAmount < (expectedAmount - 0.5))) {
            console.warn(`⚠️ Underpayment detected for ${internalOrderId}. Paid: ${receivedAmount.toFixed(2)} ${orderCurrency}, Expected: ${expectedAmount} ${orderCurrency}`);

            await supabaseAdmin.from('payment_orders').update({
                status: 'partial_paid',
                payment_id: body.paymentId || body.transaction_id || body.utr,
                payment_method: body.paymentMethod || 'gateway',
                metadata: { ...existingOrder.metadata, received_amount: receivedAmount, raw_webhook_amount: amount, gateway_currency: gatewayName === 'sharkpay' ? 'INR' : orderCurrency }
            }).eq('order_id', internalOrderId);

            return res.json({ message: 'Payment partial, account not created' });
        }

        const { data: order, error: updateError } = await supabaseAdmin
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
            .maybeSingle();

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

        // Guest Checkout Resolution: Resolve user_id if null
        if (!finalOrder.user_id) {
            const customerEmail = finalOrder.metadata?.customerEmail || finalOrder.metadata?.email || body.email;
            if (customerEmail) {
                console.log(`[Payment Webhook] Guest checkout detected. Searching for user with email: ${customerEmail}`);

                // 1. Try to find existing profile
                const { data: guestProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .ilike('email', customerEmail)
                    .maybeSingle();

                if (guestProfile) {
                    finalOrder.user_id = guestProfile.id;
                    console.log(`[Payment Webhook] Resolved user_id ${guestProfile.id} for guest email ${customerEmail}`);
                } else {
                    // 2. If no profile, create Auth User & Profile
                    console.log(`[Payment Webhook] No profile found for ${customerEmail}. Creating new user...`);

                    try {
                        // Check if auth user exists first (in case profile is just missing)
                        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
                        const existingAuthUser = authUsers.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());

                        let newUserId = existingAuthUser?.id;

                        if (!newUserId) {
                            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                                email: customerEmail,
                                password: Math.random().toString(36).slice(-12) + 'Aa1!', // Random secure password
                                email_confirm: true
                            });

                            if (createError) throw createError;
                            newUserId = newUser.user.id;
                            console.log(`[Payment Webhook] Created new Auth User: ${newUserId}`);
                        } else {
                            console.log(`[Payment Webhook] Found existing Auth User ${newUserId}, but Profile was missing.`);
                        }

                        // Ensure Profile Exists
                        const fullName = finalOrder.metadata?.customerName || customerEmail.split('@')[0];
                        const phone = finalOrder.metadata?.phone || finalOrder.metadata?.phone_number || body.phone || body.phone_number || body.customerPhone || null;
                        const { error: profError } = await supabaseAdmin.from('profiles').upsert({
                            id: newUserId,
                            email: customerEmail,
                            full_name: fullName,
                            phone: phone,
                            metadata: { source: 'guest_checkout_webhook' }
                        });

                        if (profError) {
                            console.error(`[Payment Webhook] Profile creation failed:`, profError);
                            // Even if profile fails, we have the auth user ID, so we can try to proceed
                            finalOrder.user_id = newUserId;
                            console.log(`[Payment Webhook] Proceeding with user_id ${newUserId} despite profile error.`);
                        } else {
                            console.log(`[Payment Webhook] Created/Ensured Profile for ${newUserId}`);
                            finalOrder.user_id = newUserId;

                            // 🛡️ KLAVIYO SYNC
                            try {
                                const { KlaviyoService } = await import('../services/klaviyo-service');
                                const [firstName, ...rest] = fullName.split(' ');
                                const lastName = rest.join(' ');
                                await KlaviyoService.syncUser(customerEmail, firstName, lastName, phone);
                            } catch (kError) {
                                console.error('[Klaviyo] Sync failed for guest user:', kError);
                            }
                        }

                    } catch (createUserError: any) {
                        console.error(`[Payment Webhook] Failed to create guest user:`, createUserError);
                    }
                }

                if (finalOrder.user_id) {
                    await supabaseAdmin.from('payment_orders').update({ user_id: finalOrder.user_id }).eq('order_id', internalOrderId);
                } else {
                    console.warn(`⚠️ [Payment Webhook] Guest checkout: Could not resolve or create user for ${customerEmail}.`);
                }

            } else {
                console.warn(`⚠️ [Payment Webhook] Guest checkout: No email found in metadata/payload for order ${internalOrderId}.`);
            }
        }



        // ---------------------------------------------------------
        // AFFILIATE COMMISSION LOGIC
        // ---------------------------------------------------------
        try {

            await processAffiliateCommission(finalOrder.user_id, finalOrder.amount, finalOrder.order_id);
        } catch (affError) {
            console.error('⚠️ [Affiliate] Failed to process affiliate commission:', affError);
        }
        // ---------------------------------------------------------

        // 4. Create MT5 Account via Bridge

        const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', finalOrder.user_id).maybeSingle();

        const fullName = profile?.full_name || 'Trader';
        const email = profile?.email || 'noemail@sharkfunded.com';

        let mt5Data = { login: finalOrder.login, password: finalOrder.master_password, investor_password: finalOrder.investor_password, server: finalOrder.server };
        let challengeType = 'evaluation'; // Declare at top level scope

        if (finalOrder.is_account_created && finalOrder.login) {

            // Try to resolve challengeType from existing challenge if possible,
            // but for BOGO it's usually the same as main.
        } else {
            const accountTypeName = (order.account_type_name || '').toLowerCase();
            const isCompetition = order.model === 'competition' || (order.metadata && order.metadata.type === 'competition');

            // Resolve Group with Fallbacks
            let mt5Group = 'demo\\forex';
            let leverage = 100;

            if (order.metadata?.mt5_group) {
                mt5Group = order.metadata.mt5_group;
            } else if (order.account_types?.mt5_group_name) {
                mt5Group = order.account_types.mt5_group_name;
            }

            // Handle Bolt Fallback (if metadata was stripped or missing)
            if (mt5Group === 'demo\\forex' && (order.model === 'bolt' || accountTypeName.includes('bolt'))) {
                mt5Group = 'OC\\contest\\S\\1';
            }

            // Handle Competition Overrides
            if (isCompetition || order.metadata?.is_competition) {
                leverage = 100;
                mt5Group = 'OC\\contest\\S\\9';
            }



            mt5Data = await createMT5Account({
                name: fullName,
                email: email,
                group: mt5Group,
                leverage: leverage,
                balance: order.account_size,
                callback_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/webhooks/mt5`
            }) as any;



            // 5. Create Challenge Record & Competition Participant
            // 5. Determine Valid Challenge Type (Must match database constraint)
            challengeType = 'evaluation'; // Default fallback
            let model = (order.model || '').toLowerCase();
            let type = (order.metadata?.type || '').toLowerCase();

            // Robust parsing of model/type if missing
            if (!type && order.metadata?.account_type) {
                const at = order.metadata.account_type.toLowerCase();
                if (at.includes('instant')) type = 'instant';
                else if (at.includes('1-step')) type = '1-step';
                else if (at.includes('2-step')) type = '2-step';
            }

            if (isCompetition) {
                challengeType = 'competition';
            } else if (model && type) {
                // SPECIAL CASE: Bolt model maps to direct_funded challenge type
                if (model === 'bolt') {
                    challengeType = 'direct_funded';
                } else {
                    // Map common patterns to snake_case (e.g. Model: 'lite', Type: '2-step' -> 'lite_2_step_phase_1')
                    const normalizedType = type.replace('-', '_').replace(' ', '_');
                    if (normalizedType === '2_step') {
                        challengeType = `${model}_2_step_phase_1`;
                    } else {
                        challengeType = `${model}_${normalizedType}`;
                    }
                }
            } else {
                // Fallback for older orders or manual creations
                const rawName = (order.account_type_name || '').toLowerCase();
                if (rawName.includes('lite')) {
                    if (rawName.includes('instant')) challengeType = 'lite_instant';
                    else if (rawName.includes('1 step') || rawName.includes('1-step')) challengeType = 'lite_1_step';
                    else if (rawName.includes('2 step') || rawName.includes('2-step')) challengeType = 'lite_2_step_phase_1';
                } else if (rawName.includes('prime')) {
                    if (rawName.includes('instant')) challengeType = 'prime_instant';
                    else if (rawName.includes('1 step') || rawName.includes('1-step')) challengeType = 'prime_1_step';
                    else if (rawName.includes('2 step') || rawName.includes('2-step')) challengeType = 'prime_2_step_phase_1';
                }
            }



            if (!finalOrder.user_id) {
                console.error(`❌ [Payment] Cannot create challenge: No user_id resolved for order ${internalOrderId}`);
                throw new Error(`Challenge record could not be created: No user_id resolved`);
            }

            const { data: challenge, error: challengeError } = await supabase
                .from('challenges')
                .insert({
                    user_id: finalOrder.user_id,
                    challenge_type: challengeType,
                    initial_balance: order.account_size,
                    current_balance: order.account_size,
                    current_equity: order.account_size,
                    start_of_day_equity: order.account_size,
                    status: 'active',
                    login: mt5Data.login,
                    master_password: (mt5Data as any).password,
                    investor_password: (mt5Data as any).investor_password || '',
                    server: (mt5Data as any).server || 'Xylo Markets Ltd',
                    platform: order.platform,
                    leverage: leverage,
                    group: mt5Group, // Store actual used group
                    metadata: order.metadata || {}, // Pass through all metadata (including competition details)
                })
                .select()
                .maybeSingle();

            if (challengeError) {
                console.error(`❌ [Payment] Challenge Creation Failed:`, challengeError.message);
                throw new Error(`Challenge record could not be created: ${challengeError.message}`);
            }



            // If competition, also add to participants table
            if (isCompetition && challenge && order.metadata?.competition_id) {
                await supabaseAdmin.from('competition_participants').insert({
                    competition_id: order.metadata.competition_id,
                    user_id: finalOrder.user_id,
                    status: 'active',
                    challenge_id: challenge.id
                });
            }

            // 6. Finalize Order
            if (challenge) {
                await supabaseAdmin.from('payment_orders').update({
                    challenge_id: challenge.id,
                    is_account_created: true,
                }).eq('order_id', internalOrderId);
            }

            // 7. Send Emails (Credentials & Welcome)
            if (email) {
                // Always send Credentials
                await EmailService.sendAccountCredentials(
                    email,
                    fullName,
                    String(mt5Data.login),
                    (mt5Data as any).password,
                    (mt5Data as any).server || 'Xylo Markets Ltd',
                    (mt5Data as any).investor_password
                ).catch((e: any) => console.error('Failed to send credentials email:', e));
            }
        }

        // 7. Success Redirect
        if (req.method === 'GET') {
            return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}&amount=${order.amount}`);
        }

        // 8. BOGO LOGIC: If coupon_type is 'bogo', create a second FREE account
        let isBOGO = false;
        if (order.metadata && (order.metadata.coupon_type === 'bogo' || (order.metadata.coupon_type === undefined && order.coupon_code && order.coupon_code.toUpperCase().includes('BOGO')))) {
            isBOGO = true;
        }

        // Fix for Case Sensitivity: explicitly uppercase check or ilike was already doing it but logic flow was tricky
        if (!isBOGO && order.coupon_code) {
            // We already check for "BOGO" in code above.
            // But if code is "SINGLE", it failed above.
            // We need to look up coupon in DB.
        }

        // Final safe check: Look up the coupon itself in the database if not already flagged
        if (order.coupon_code) {
            const { data: coupon, error: couponError } = await supabaseAdmin
                .from('discount_coupons')
                .select('id, uses_count, max_uses, discount_type') // Added discount_type to select
                .ilike('code', order.coupon_code.trim())
                .maybeSingle();

            if (coupon && coupon.discount_type === 'bogo') { // Added condition for discount_type
                // Increment usage count if valid
                isBOGO = true; // Corrected sBOGO to isBOGO

            }
        }

        if (isBOGO) {


            try {
                // Check if BOGO account already exists for this order
                const { data: existingBOGO } = await supabase
                    .from('challenges')
                    .select('id')
                    .contains('metadata', { parent_order_id: internalOrderId, is_bogo_free: true })
                    .maybeSingle();

                if (existingBOGO) {

                } else {
                    // Generate a pseudo-order ID for the free account
                    const freeOrderId = `SF-BOGO-${internalOrderId}-${Date.now()}`;

                    // Create MT5 Account (Free)

                    // Use same params as main account (which we now have reliably)
                    const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', finalOrder.user_id).maybeSingle();
                    const fullName = profile?.full_name || 'Trader';
                    const email = profile?.email || 'noemail@sharkfunded.com';

                    // Re-calculate group if not already in scope (though it should be)
                    let mt5Group = order.metadata?.mt5_group || order.account_types?.mt5_group_name || 'OC\\contest\\S\\2';
                    let leverage = 100;
                    if (order.model === 'competition' || order.metadata?.is_competition) {
                        mt5Group = 'OC\\contest\\S\\9';
                    }

                    const mt5DataFree = await createMT5Account({
                        name: fullName,
                        email: email,
                        group: mt5Group,
                        leverage: leverage,
                        balance: order.account_size,
                        callback_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/webhooks/mt5`
                    }) as any;



                    // Create Challenge Record (Free)
                    const bogoMetadata = {
                        ...(order.metadata || {}),
                        is_bogo_free: true,
                        parent_order_id: internalOrderId
                    };

                    fs.appendFileSync('backend_request_debug.log', `[BOGO DEBUG] Login: ${mt5DataFree.login}, Metadata: ${JSON.stringify(bogoMetadata)}\n`);

                    const { data: freeChallenge } = await supabase
                        .from('challenges')
                        .insert({
                            user_id: finalOrder.user_id,
                            challenge_type: (challengeType || 'evaluation'), // use the same mapped type as main
                            initial_balance: order.account_size,
                            current_balance: order.account_size,
                            current_equity: order.account_size,
                            start_of_day_equity: order.account_size,
                            status: 'active',
                            login: mt5DataFree.login,
                            master_password: mt5DataFree.password,
                            investor_password: mt5DataFree.investor_password || '',
                            server: mt5DataFree.server || 'Xylo Markets Ltd',
                            platform: order.platform,
                            leverage: leverage,
                            group: mt5Group,
                            metadata: bogoMetadata,
                        })
                        .select()
                        .maybeSingle();

                    if (freeChallenge) {


                        // Send Email for Free Account
                        if (email) {
                            await EmailService.sendAccountCredentials(
                                email,
                                fullName,
                                String(mt5DataFree.login),
                                mt5DataFree.password,
                                mt5DataFree.server || 'Xylo Markets Ltd',
                                mt5DataFree.investor_password
                            ).catch((e: any) => console.error('Failed to send BOGO credentials email:', e));
                        }
                    }
                }

            } catch (bogoError) {
                console.error(`❌ [BOGO] Failed to create free account:`, bogoError);
                // Don't fail the main request, just log it.
            }
        }

        res.json({ success: true, message: 'Process completed' });

    } catch (error: any) {
        console.error('❌ Payment Webhook Error:', error);
        try {
            fs.appendFileSync('debug_webhook_error.log', `[WEBHOOK ERROR] ${new Date().toISOString()} - ${error.message} - Stack: ${error.stack}\n`);
        } catch (e) {}
        fs.appendFileSync('backend_request_debug.log', `[WEBHOOK ERROR] ${new Date().toISOString()} - ${error.message} - Stack: ${error.stack}\n`);
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


    // 0. Check if commission already exists for this order to avoid duplicates
    const { data: existingComm } = await supabaseAdmin
        .from('affiliate_earnings')
        .select('id')
        .contains('metadata', { order_id: orderId })
        .maybeSingle();

    if (existingComm) {
        log(`ℹ️ Commission already exists for order ${orderId}. Skipping duplicate.`);

        return;
    }
    const { data: orderData } = await supabaseAdmin
        .from('payment_orders')
        .select('metadata, coupon_code')
        .eq('order_id', orderId)
        .maybeSingle();

    let referrerId = orderData?.metadata?.affiliate_id;

    // Fallback: Check Coupon Code
    if (!referrerId && orderData?.coupon_code) {
        const { data: coupon } = await supabaseAdmin
            .from('discount_coupons')
            .select('affiliate_id')
            .ilike('code', orderData.coupon_code.trim())
            .maybeSingle();

        if (coupon?.affiliate_id) {
            referrerId = coupon.affiliate_id;
            log(`✅ Found referrer from coupon: ${referrerId}`);
        }
    }

    if (!referrerId) {
        // Fallback to profile referral
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('referred_by')
            .eq('id', userId)
            .maybeSingle();

        referrerId = profile?.referred_by;
    }

    if (!referrerId) {
        log(`ℹ️ No referrer for user ${userId} (checked metadata, coupon, and profile)`);

        return;
    }

    log(`✅ Referrer found: ${referrerId}`);


    // 2. Calculate Commission (Multi-level Fallback)
    let commissionRate = 0.07; // System Default

    // Level 1: Check Order Metadata (Directly stored during checkout)
    if (orderData?.metadata?.commission_rate !== undefined && orderData?.metadata?.commission_rate !== null) {
        commissionRate = Number(orderData.metadata.commission_rate) / 100;
        log(`💰 Rate from Metadata: ${commissionRate * 100}%`);
    }
    // Level 2: Check Coupon Settings (Case-insensitive lookup)
    else if (orderData?.coupon_code) {
        const { data: coupon } = await supabase
            .from('discount_coupons')
            .select('commission_rate')
            .ilike('code', orderData.coupon_code.trim())
            .maybeSingle();

        if (coupon?.commission_rate !== undefined && coupon?.commission_rate !== null) {
            commissionRate = Number(coupon.commission_rate) / 100;
            log(`💰 Rate from Coupon Table (${orderData.coupon_code}): ${commissionRate * 100}%`);
        }
    }

    // Level 3: Check Affiliate Profile (Custom percentage for this user)
    if (commissionRate === 0.07) { // Only if we haven't found a better rate yet
        const { data: affiliate } = await supabase
            .from('profiles')
            .select('affiliate_percentage')
            .eq('id', referrerId)
            .maybeSingle();

        if (affiliate?.affiliate_percentage !== undefined && affiliate?.affiliate_percentage !== null) {
            commissionRate = Number(affiliate.affiliate_percentage) / 100;
            log(`💰 Rate from Affiliate Profile: ${commissionRate * 100}%`);
        }
    }

    if (commissionRate === 0.07) {
        log(`💰 Falling back to System Default Rate: 7%`);
    }

    const commissionAmount = Number((amount * commissionRate).toFixed(2));
    log(`💰 Commission Rate: ${commissionRate * 100}%, Amount: ${commissionAmount}`);


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
    }).select().maybeSingle();

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

    }
}
