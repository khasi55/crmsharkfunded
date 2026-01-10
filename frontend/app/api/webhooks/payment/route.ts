import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Payment Success Webhook
 * Called by payment gateway after successful payment
 * Creates MT5 account and assigns to user
 */
export async function POST(request: NextRequest) {
    return handleWebhook(request);
}

export async function GET(request: NextRequest) {
    // For GET requests (user redirection), we still want to process the order
    // if the webhook hasn't arrived yet, but we ultimately want to redirect
    // the user to the success page.
    await handleWebhook(request);

    // Parse params again to construct redirect URL
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId') || searchParams.get('reference_id');
    const amount = searchParams.get('amount');

    // Redirect to success page
    const successUrl = new URL('/payment/success', request.url);
    if (orderId) successUrl.searchParams.set('orderId', orderId);
    if (amount) successUrl.searchParams.set('amount', amount);

    return NextResponse.redirect(successUrl);
}

async function handleWebhook(request: NextRequest) {
    try {
        const supabase = createAdminClient();
        let body: any = {};

        if (request.method === 'GET') {
            const searchParams = request.nextUrl.searchParams;
            searchParams.forEach((value, key) => {
                body[key] = value;
            });
        } else {
            try {
                body = await request.json();
            } catch (e) {
                console.error('Failed to parse webhook JSON:', e);
                return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
            }
        }

        console.log('Webhook received:', { method: request.method, body });

        // Normalizing payload fields
        // SharkPay: reference_id
        // Paymid: reference
        // Generic: orderId, internalOrderId
        const internalOrderId = body.reference_id || body.reference || body.orderId || body.internalOrderId;
        const status = body.status || body.event?.split('.')[1]; // 'payment.success' -> 'success'

        if (!internalOrderId) {
            console.error('Missing order ID in webhook:', body);
            // If GET, we can't do much but redirect with error? For now just return json for bad request
            if (request.method === 'GET') {
                return NextResponse.redirect(new URL('/payment/failed', request.url));
            }
            return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
        }

        // ... Logging code omitted for brevity, keeping existing ...

        // Log webhook immediately for auditing
        const { data: webhookLog, error: logError } = await supabase
            .from('webhook_logs')
            .insert({
                event_type: body.event || 'unknown',
                gateway: body.gateway || 'unknown',
                order_id: internalOrderId,
                gateway_order_id: body.orderId || body.transaction_id,
                amount: body.amount,
                status: status || 'unknown',
                utr: body.utr,
                request_body: body,
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                user_agent: request.headers.get('user-agent'),
            })
            .select()
            .single();

        const webhookLogId = webhookLog?.id;

        // ... Check success status ...
        const isSuccess =
            status === 'success' ||
            status === 'paid' ||
            status === 'verified' ||
            body.event === 'payment.success';

        if (!isSuccess) {
            console.log('Payment not successful/verified:', status);
            return NextResponse.json({ message: 'Payment not successful' });
        }

        const paymentId = body.paymentId || body.transaction_id || body.utr;
        const paymentMethod = body.paymentMethod || body.payment_method || 'gateway';

        // ATOMIC UPDATE CHECK
        // Try to update status from 'pending' to 'paid'. 
        // If this returns no rows, it means the order is already processed or doesn't exist.
        const { data: updatedOrder, error: updateError } = await supabase
            .from('payment_orders')
            .update({
                status: 'paid',
                payment_id: paymentId,
                payment_method: paymentMethod,
                paid_at: new Date().toISOString(),
            })
            .eq('order_id', internalOrderId)
            .eq('status', 'pending') // CRITICAL: Only update if pending to prevent race conditions
            .select('*, account_types(*)') // Fetch the order data here
            .single();

        if (updateError && updateError.code === 'PGRST116') {
            // Order already processed or not found
            console.log('Order already processed or not found (atomic check):', internalOrderId);
            // If we want to be sure it was processed, we could fetch it, but for race condition logic return basic success
            return NextResponse.json({ message: 'Order already processed' });
        }

        if (updateError) {
            console.error('Failed to update order status:', updateError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Use the updated order data
        const order = updatedOrder;

        // SKIP explicit check for is_account_created since we rely on the atomic update above.
        // If we got here, we are the one processing it.

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', order.user_id)
            .single();

        const fullName = profile?.full_name || 'Trader';
        const email = profile?.email || 'noemail@sharkfunded.com';

        // Create MT5 account
        let mt5Group = order.account_types?.mt5_group_name || 'demo\\Pro-Platinum';
        const accountTypeName = (order.account_type_name || '').toLowerCase();

        // Check for competition
        const isCompetition = order.model === 'competition' || (order.metadata && order.metadata.type === 'competition');

        // Override group for Rapid and Evaluation as requested
        if (isCompetition) {
            mt5Group = 'demo\\Pro-Platinum';
        } else if (accountTypeName.includes('1 step') || accountTypeName.includes('2 step') || accountTypeName.includes('evaluation') || accountTypeName.includes('instant') || accountTypeName.includes('rapid')) {
            mt5Group = 'demo\\Pro-Platinum';
        }

        const mt5Payload = {
            group: mt5Group,
            leverage: order.account_types?.leverage || 100, // Default to 100 if missing
            name: fullName,
            email: email,
            balance: order.account_size,
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mt5`
        };

        const mt5ApiUrl = process.env.MT5_API_URL || 'https://687d9be96ebb.ngrok-free.app';
        console.log('Requesting MT5 account creation via bridge:', mt5Payload);

        const mt5Response = await fetch(`${mt5ApiUrl}/create-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mt5Payload),
        });

        const mt5Data = await mt5Response.json();

        if (!mt5Response.ok) {
            console.error('MT5 account creation failed:', mt5Data);
            // Don't fail webhook - retry later logic could go here
            return NextResponse.json({
                message: 'Payment received, account creation pending'
            });
        }

        // Determine challenge type based on actual account_types
        let challengeType = 'Phase 1';
        const metadata: any = order.metadata || {};
        // accountTypeName is already defined above

        if (isCompetition) {
            challengeType = 'Competition'; // Correct type for competitions
            metadata.is_competition = true;
            metadata.challenge_type_label = 'Competition';
        }
        // Detect Pro/Prime Plans (has "pro" in name)
        else if (accountTypeName.includes('pro')) {
            if (accountTypeName.includes('instant')) challengeType = 'prime_instant';
            else if (accountTypeName.includes('1 step')) challengeType = 'prime_1_step';
            else if (accountTypeName.includes('2 step')) challengeType = 'prime_2_step';
            else challengeType = 'prime_2_step'; // Default
        }
        // Detect Regular/Lite Plans (no "pro")
        else if (accountTypeName.includes('instant funding')) {
            challengeType = 'lite_instant';
        }
        else if (accountTypeName.includes('1 step')) {
            challengeType = 'lite_1_step';
        }
        else if (accountTypeName.includes('2 step')) {
            challengeType = 'lite_2_step';
        }
        // Funded Live Master Account
        else if (accountTypeName.includes('funded') || accountTypeName.includes('master')) {
            challengeType = 'funded';
        }
        // Legacy / Fallbacks
        else {
            if (metadata.type === '2-step') challengeType = 'Phase 1';
            if (metadata.type === '1-step') challengeType = 'Evaluation';
            if (metadata.type === 'instant') challengeType = 'Instant';
        }

        // Create challenge
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .insert({
                user_id: order.user_id,
                account_type_id: order.account_type_id,
                challenge_type: challengeType,
                initial_balance: order.account_size,
                current_balance: order.account_size,
                current_equity: order.account_size,
                start_of_day_equity: order.account_size,
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server,
                platform: order.platform,
                model: order.model,
                leverage: order.account_types?.leverage || 100,
                metadata: {
                    ...metadata,
                    order_id: internalOrderId,
                    payment_id: paymentId,
                    purchased_at: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (challengeError) {
            console.error('Challenge creation error:', challengeError);
            return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
        }

        // --- Competition Participant Logic ---
        if (isCompetition && challenge) {
            try {
                const competitionId = metadata.competition_id;
                if (competitionId) {
                    const { error: partError } = await supabase.from('competition_participants').insert({
                        competition_id: competitionId,
                        user_id: order.user_id,
                        status: 'active',
                        challenge_id: challenge.id
                    });

                    if (partError) {
                        console.error('Failed to register competition participant DB error:', partError);
                    } else {
                        console.log('✅ Competition participant registered for order:', internalOrderId);
                    }
                }
            } catch (compError) {
                console.error('Failed to register competition participant:', compError);
                // Don't fail the webhook, but log it
            }
        }

        // Link challenge to order
        await supabase
            .from('payment_orders')
            .update({
                challenge_id: challenge.id,
                is_account_created: true,
            })
            .eq('order_id', internalOrderId);

        console.log('✅ Account created successfully for order:', internalOrderId);

        // ---------------------------------------------------------
        // Affiliate Commission Logic
        // ---------------------------------------------------------
        try {
            console.log(`Checking affiliate status for user: ${order.user_id}`);

            // Check if user was referred by someone
            const { data: userProfile, error: profileError } = await supabase
                .from('profiles')
                .select('referred_by, full_name, email')
                .eq('id', order.user_id)
                .single();

            if (profileError) {
                console.error('Error fetching user profile for affiliate check:', profileError);
            } else {
                console.log('Affiliate check profile data:', userProfile);
            }

            if (userProfile && userProfile.referred_by) {
                const commissionRate = 0.15; // 15%
                const commissionAmount = Number(order.amount) * commissionRate;
                const referrerId = userProfile.referred_by;

                console.log(`Processing affiliate commission for referrer ${referrerId}. Amount: ${commissionAmount}`);

                // 1. Record the earning
                const { error: earningError } = await supabase
                    .from('affiliate_earnings')
                    .insert({
                        referrer_id: referrerId,
                        referred_user_id: order.user_id,
                        amount: commissionAmount,
                        description: `Commission for ${order.account_type_name} challenge purchase by ${userProfile.full_name || 'User'}`,
                    });

                if (earningError) {
                    console.error('Failed to record affiliate earning:', earningError);
                } else {
                    // 2. Update referrer's total commission
                    const { data: referrerProfile, error: refProfileError } = await supabase
                        .from('profiles')
                        .select('total_commission')
                        .eq('id', referrerId)
                        .single();

                    if (refProfileError) {
                        console.error('Error fetching referrer profile:', refProfileError);
                    }

                    const newTotal = (Number(referrerProfile?.total_commission) || 0) + commissionAmount;

                    const { error: updateProfileError } = await supabase
                        .from('profiles')
                        .update({ total_commission: newTotal })
                        .eq('id', referrerId);

                    if (updateProfileError) {
                        console.error('Failed to update referrer commission balance:', updateProfileError);
                    } else {
                        console.log('✅ Affiliate commission recorded successfully');
                    }
                }
            } else {
                console.log('User has no referrer, skipping commission.');
            }
        } catch (affiliateError) {
            console.error('Error processing affiliate commission:', affiliateError);
            // Don't fail the webhook for this side effect
        }

        // Mark webhook as processed
        if (webhookLogId) {
            await supabase
                .from('webhook_logs')
                .update({
                    processed: true,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', webhookLogId);
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
        });

    } catch (error: any) {
        console.error('Payment webhook error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
