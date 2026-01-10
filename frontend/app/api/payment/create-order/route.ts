import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Create Payment Order (Step 1 of purchase flow)
 * User selects plan → Create order → Redirect to payment gateway
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type, model, size, platform, coupon, gateway = 'sharkpay', competitionId } = body;

        // Validation
        if (type !== 'competition' && (!model || !size || !platform)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // SECURITY FIX: Whitelist Allowed Sizes
        const ALLOWED_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];
        if (type !== 'competition' && !ALLOWED_SIZES.includes(Number(size))) {
            return NextResponse.json({ error: 'Invalid account size selected.' }, { status: 400 });
        }

        // Always use USD as currency
        const currency = 'USD';

        // 1. Handle Competition Type
        if (type === 'competition') {
            if (!competitionId) {
                return NextResponse.json({ error: 'competitionId required for competition join' }, { status: 400 });
            }

            const { data: competition, error: compError } = await supabase
                .from('competitions')
                .select('*')
                .eq('id', competitionId)
                .single();

            if (compError || !competition) {
                return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
            }

            const amount = competition.entry_fee || 9; // Default to 9 as per user request
            const orderId = `SF-COMP-${Date.now()}-${require('crypto').randomBytes(4).toString('hex')}`;

            const { data: order, error: orderError } = await supabase
                .from('payment_orders')
                .insert({
                    user_id: user.id,
                    order_id: orderId,
                    amount: amount,
                    currency: 'USD',
                    status: 'pending',
                    account_type_name: `Competition: ${competition.title}`,
                    account_size: 100000, // Default competition balance
                    platform: 'MT5',
                    model: 'competition',
                    payment_gateway: gateway.toLowerCase(),
                    metadata: {
                        competition_id: competitionId,
                        type: 'competition'
                    },
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Initialize SharkPay (Competition only supports SharkPay as requested)
            const { getPaymentGateway } = await import('@/lib/payment-gateways');
            const paymentGateway = getPaymentGateway('sharkpay');

            const paymentResponse = await paymentGateway.createOrder({
                orderId: order.order_id,
                amount: amount,
                currency: 'USD',
                customerEmail: user.email || 'noemail@sharkfunded.com',
                customerName: 'Trader',
                metadata: {
                    competition_id: competitionId,
                },
            });

            return NextResponse.json({
                success: true,
                order: {
                    id: order.id,
                    orderId: order.order_id,
                },
                paymentUrl: paymentResponse.paymentUrl,
            });
        }

        // 2. Handle Challenge Types (Existing Logic)
        // Determine account type name
        let accountTypeName = '';
        if (model === 'pro') {
            if (type === 'instant') accountTypeName = 'Instant Funding Pro';
            else if (type === '1-step') accountTypeName = '1 Step Pro';
            else if (type === '2-step') accountTypeName = '2 Step Pro';
        } else {
            if (type === 'instant') accountTypeName = 'Instant Funding';
            else if (type === '1-step') accountTypeName = '1 Step';
            else if (type === '2-step') accountTypeName = '2 Step';
        }

        // Fetch account type
        const { data: accountType, error: accountTypeError } = await supabase
            .from('account_types')
            .select('*')
            .eq('name', accountTypeName)
            .eq('status', 'active')
            .single();

        if (accountTypeError || !accountType) {
            return NextResponse.json({
                error: 'Invalid account type configuration'
            }, { status: 400 });
        }

        // Calculate pricing in USD (base currency)
        const basePrice = await calculatePrice(type, model, size, supabase);

        // Validate and apply coupon discount
        let discountAmount = 0;
        let couponError = null;

        if (coupon) {
            const { data: couponResult } = await supabase
                .rpc('validate_coupon', {
                    p_code: coupon,
                    p_user_id: user.id,
                    p_amount: basePrice,
                    p_account_type: accountTypeName,
                });

            if (couponResult && couponResult.length > 0) {
                const result = couponResult[0];
                if (result.is_valid) {
                    discountAmount = result.discount_amount;
                } else {
                    couponError = result.error_message;
                    // Don't fail the order, just ignore invalid coupon
                }
            }
        }

        const finalAmount = basePrice - discountAmount;

        // Generate order ID
        const { data: orderIdResult } = await supabase.rpc('generate_order_id');
        const orderId = orderIdResult || `SF-ORDER-${Date.now()}-${require('crypto').randomBytes(4).toString('hex')}`;

        // Create payment order (store everything in USD)
        const { data: order, error: orderError } = await supabase
            .from('payment_orders')
            .insert({
                user_id: user.id,
                order_id: orderId,
                amount: finalAmount, // USD amount
                currency: 'USD', // Always store in USD
                status: 'pending',
                account_type_name: accountTypeName,
                account_type_id: accountType.id,
                account_size: Number(size),
                platform: platform,
                model: model,
                coupon_code: coupon || null,
                discount_amount: discountAmount,
                payment_gateway: gateway.toLowerCase(),
                metadata: {
                    type,
                    leverage: accountType.leverage,
                    mt5_group: accountType.mt5_group_name,
                },
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
            return NextResponse.json({
                error: 'Failed to create order'
            }, { status: 500 });
        }

        // Get user profile for payment gateway
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

        // Initialize payment with gateway
        const { getPaymentGateway } = await import('@/lib/payment-gateways');
        const paymentGateway = getPaymentGateway(gateway.toLowerCase());

        // Payment gateway will handle currency conversion internally
        const paymentResponse = await paymentGateway.createOrder({
            orderId: order.order_id,
            amount: finalAmount, // USD amount - gateway converts if needed
            currency: 'USD', // Always pass USD
            customerEmail: user.email || profile?.email || 'noemail@sharkfunded.com',
            customerName: profile?.full_name || 'Trader',
            metadata: {
                account_type: accountTypeName,
                account_size: size,
                platform: platform,
            },
        });

        if (!paymentResponse.success) {
            console.error('Payment gateway error:', paymentResponse.error);
            return NextResponse.json({
                error: 'Failed to initialize payment',
                details: paymentResponse.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                orderId: order.order_id,
                amount: order.amount,
                currency: order.currency,
                gatewayOrderId: paymentResponse.gatewayOrderId,
            },
            paymentUrl: paymentResponse.paymentUrl, // Redirect user here
            couponApplied: discountAmount > 0,
            couponError: couponError,
        });

    } catch (error: any) {
        console.error('Create order error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Helper function to calculate price in USD
async function calculatePrice(type: string, model: string, size: string, supabase: any): Promise<number> {
    const sizeNum = Number(size);
    let priceUSD = 0;

    // Exact pricing matching frontend
    if (type === '1-step') {
        if (sizeNum === 5000) priceUSD = 39;
        else if (sizeNum === 10000) priceUSD = 69;
        else if (sizeNum === 25000) priceUSD = 149;
        else if (sizeNum === 50000) priceUSD = 279;
        else if (sizeNum === 100000) priceUSD = 499;
        else if (sizeNum === 200000) priceUSD = 949;
        else priceUSD = sizeNum * 0.005;
    } else if (type === '2-step') {
        if (sizeNum === 5000) priceUSD = 29;
        else if (sizeNum === 10000) priceUSD = 49;
        else if (sizeNum === 25000) priceUSD = 119;
        else if (sizeNum === 50000) priceUSD = 229;
        else if (sizeNum === 100000) priceUSD = 449;
        else if (sizeNum === 200000) priceUSD = 899;
        else priceUSD = sizeNum * 0.0045;
    } else if (type === 'instant') {
        priceUSD = sizeNum * 0.08;
    }

    // Pro model markup
    if (model === 'pro') {
        priceUSD = priceUSD * 1.2;
    }

    return Math.round(priceUSD);
}
