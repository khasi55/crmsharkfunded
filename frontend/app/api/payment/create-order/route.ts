import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Create Payment Order (Step 1 of purchase flow)
 * User selects plan → Create order → Redirect to payment gateway
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user: sessionUser }, error: userError } = await supabase.auth.getUser();

        let user = sessionUser;
        let dbClient: any = supabase; // Default to authenticated user client

        const body = await request.json();
        console.log('📝 Create Order Request Body:', JSON.stringify(body, null, 2));

        let { type, model, size, platform, coupon, gateway = 'sharkpay', competitionId, customerEmail, password, customerName, referralCode, mt5Group, country, phone } = body;

        // Normalize inputs
        if (type) type = type.toLowerCase();
        if (model) {
            model = model.toLowerCase();
            if (model === 'standard') model = 'lite';
            if (model === 'pro') model = 'prime';
        }
        if (platform) platform = platform.toLowerCase();

        // Safety Group Calculation (Lite = \S\, Prime = \SF\)
        if (!mt5Group) {
            if (model === 'lite') {
                if (type === 'instant') mt5Group = 'demo\\S\\0-SF';
                else if (type === '1-step') mt5Group = 'demo\\S\\1-SF';
                else if (type === '2-step') mt5Group = 'demo\\S\\2-SF';
            } else if (model === 'prime') {
                if (type === 'instant') mt5Group = 'demo\\SF\\0-Pro';
                else if (type === '1-step') mt5Group = 'demo\\SF\\1-Pro';
                else if (type === '2-step') mt5Group = 'demo\\SF\\2-Pro';
            }
        }

        // Initialize Admin Client for privileged operations
        // We do this lazily or here to ensure we have it for referral updates
        const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Auto-Registration Logic if no session
        if (!user) {
            if (!customerEmail) {
                return NextResponse.json({ error: 'Unauthorized: Login or provide email' }, { status: 401 });
            }

            // Switch to Admin Client for DB operations (Bypass RLS)
            dbClient = supabaseAdmin;

            // 1. Try to get existing user by email
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: customerEmail,
                password: password || 'SharkFunded123!', // Fallback password if not provided
                email_confirm: true,
                user_metadata: {
                    full_name: customerName || 'Trader',
                    country: country,
                    phone_number: phone
                }
            });

            if (createError) {
                const { data: existingProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('email', customerEmail)
                    .single();

                if (existingProfile) {
                    user = { id: existingProfile.id, email: customerEmail } as any;
                } else {
                    return NextResponse.json({ error: 'Account exists but profile missing. Please contact support.' }, { status: 400 });
                }

            } else {
                user = newUser.user as any;
            }
        }

        // Ensure user is defined
        if (!user) {
            return NextResponse.json({ error: 'User processing failed' }, { status: 500 });
        }

        // AFFILIATE REFERRAL LOGIC
        if (referralCode && user) {
            try {
                // Use Admin client to bypass RLS for referral updates
                // This is crucial because users usually can't update their own 'referred_by' field
                const adminDb = supabaseAdmin;

                // Check if user is already referred
                const { data: currentProfile } = await adminDb
                    .from('profiles')
                    .select('referred_by')
                    .eq('id', user.id)
                    .single();

                if (currentProfile && !currentProfile.referred_by) {
                    // Find referrer by code
                    const { data: referrer } = await adminDb
                        .from('profiles')
                        .select('id')
                        .eq('referral_code', referralCode)
                        .single();

                    if (referrer) {
                        console.log(`🔗 Linking user ${user.id} to referrer ${referrer.id} from checkout`);
                        const { error: updateError } = await adminDb
                            .from('profiles')
                            .update({ referred_by: referrer.id })
                            .eq('id', user.id);

                        if (updateError) {
                            console.error('❌ Failed to link referrer:', updateError);
                        } else {
                            // Increment referral count
                            await adminDb.rpc('increment_referral_count', { p_referrer_id: referrer.id })
                                .catch((e: any) => console.warn('Referral count increment failed', e));
                        }
                    } else {
                        console.warn(`⚠️ Referral code '${referralCode}' not found.`);
                    }
                } else {
                    // Check if they are referring themselves (Self-Referral)
                    // If so, we might want to log it, but logically they are already "referred" (by themselves or someone else)
                    // so we do nothing.
                }
            } catch (refError) {
                console.warn('Referral processing error:', refError);
                // Don't block order creation
            }
        }

        // Validation
        if (type !== 'competition' && (!model || !size || !platform)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // SECURITY FIX: Whitelist Allowed Sizes
        const ALLOWED_SIZES = [3000, 6000, 12000, 5000, 10000, 25000, 50000, 100000, 200000];
        if (type !== 'competition' && !ALLOWED_SIZES.includes(Number(size))) {
            return NextResponse.json({ error: 'Invalid account size selected.' }, { status: 400 });
        }

        // Always use USD as currency
        const currency = 'USD';

        // 1. Handle Competition Type
        if (type === 'competition') {

            // Try to find active competition if not provided
            let finalCompetitionId = competitionId;
            let entryFee = 9;
            let competitionTitle = 'Trading Competition';

            if (!finalCompetitionId) {
                const { data: activeComp } = await dbClient
                    .from('competitions')
                    .select('*')
                    .in('status', ['active', 'upcoming']) // Allow joining upcoming competitions too
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (activeComp) {
                    finalCompetitionId = activeComp.id;
                    competitionTitle = activeComp.title;
                    // entryFee = activeComp.entry_fee || 9; // User requested strict $9
                }
            } else {
                const { data: competition } = await dbClient
                    .from('competitions')
                    .select('*')
                    .eq('id', competitionId)
                    .single();
                if (competition) {
                    competitionTitle = competition.title;
                    // entryFee = competition.entry_fee || 9;
                }
            }

            const amount = 9; // Hardcoded as per user request
            const orderId = `SFCOM${Date.now()}${require('crypto').randomBytes(4).toString('hex')}`;


            const { data: order, error: orderError } = await dbClient
                .from('payment_orders')
                .insert({
                    user_id: user.id,
                    order_id: orderId,
                    amount: amount,
                    currency: 'USD',
                    status: 'pending',
                    account_type_name: `Competition: ${competitionTitle}`,
                    account_size: 100000, // Default competition balance
                    platform: 'MT5',
                    model: 'competition',
                    payment_gateway: gateway.toLowerCase(),
                    metadata: {
                        competition_id: finalCompetitionId, // Can be null (Generic Account)
                        competition_title: competitionTitle,
                        type: 'competition',
                        leverage: 30 // Hardcoded leverage as requested
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
                    competition_id: finalCompetitionId,
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

        // 2. Handle Challenge Types (Simplified Lite/Prime Mapping)
        let accountTypeName = '';
        const modelSuffix = model === 'lite' ? 'Lite' : 'Prime';

        if (type === 'instant') {
            accountTypeName = `Instant Funding ${modelSuffix}`;
        } else if (type === '1-step') {
            accountTypeName = `1 Step ${modelSuffix}`;
        } else if (type === '2-step') {
            accountTypeName = `2 Step ${modelSuffix}`;
        } else {
            // Default fallback
            accountTypeName = `${type || 'Challenge'} ${modelSuffix}`;
        }

        // OPTIMIZATION: Fetch Profile and Account Type in Parallel to reduce cross-region latency
        const [accountTypeRes, profileRes] = await Promise.all([
            dbClient
                .from('account_types')
                .select('*')
                .eq('name', accountTypeName)
                .eq('status', 'active')
                .single(),
            dbClient
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single()
        ]);

        const accountType = accountTypeRes.data;
        const profile = profileRes.data;

        if (accountTypeRes.error || !accountType) {
            return NextResponse.json({
                error: 'Invalid account type configuration'
            }, { status: 400 });
        }

        // Calculate pricing in USD (base currency)
        const basePrice = await calculatePrice(type, model, size, dbClient);

        // Validate and apply coupon discount
        let discountAmount = 0;
        let couponError = null;
        let affiliateIdFromCoupon = null;

        if (coupon) {
            // FIX: Use direct DB query instead of RPC to ensure consistency with backend/routes/coupons.ts
            const { data: couponData } = await dbClient
                .from('discount_coupons')
                .select('*')
                .eq('code', coupon.toUpperCase())
                .eq('is_active', true)
                .single();

            if (couponData) {
                const now = new Date();
                const validFrom = new Date(couponData.valid_from);
                const validUntil = couponData.valid_until ? new Date(couponData.valid_until) : null;
                const minPurchase = couponData.min_purchase_amount || 0;

                let isValid = true;
                if (now < validFrom) isValid = false;
                if (validUntil && now > validUntil) isValid = false;
                if (basePrice < minPurchase) isValid = false;

                if (isValid) {
                    affiliateIdFromCoupon = couponData.affiliate_id;
                    if (couponData.discount_type === 'percentage') {
                        discountAmount = (basePrice * couponData.discount_value) / 100;
                        if (couponData.max_discount_amount) {
                            discountAmount = Math.min(discountAmount, couponData.max_discount_amount);
                        }
                    } else if (couponData.discount_type === 'bogo') {
                        // BOGO: No monetary discount on the first order
                        discountAmount = 0;
                    } else {
                        discountAmount = couponData.discount_value;
                    }
                    // Cap at total amount
                    discountAmount = Math.min(discountAmount, basePrice);
                } else {
                    couponError = "Coupon is not valid for this purchase";
                }
            } else {
                couponError = "Invalid coupon code";
            }
        }

        const finalAmount = basePrice - discountAmount;

        // Generate ID Locally to save 1 Round Trip (US -> AUS)
        // EPay Docs: "orderID must be alphanumeric"
        const orderId = `SFORD${Date.now()}${require('crypto').randomBytes(4).toString('hex')}`;


        // Create payment order (store everything in USD)
        const { data: order, error: orderError } = await dbClient
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
                    mt5_group: mt5Group || accountType.mt5_group_name,
                    affiliate_id: affiliateIdFromCoupon || null,
                    commission_rate: coupon ? (await dbClient.from('discount_coupons').select('commission_rate').eq('code', coupon.toUpperCase()).single()).data?.commission_rate : null,
                    coupon_type: coupon ? (await dbClient.from('discount_coupons').select('discount_type').eq('code', coupon.toUpperCase()).single()).data?.discount_type : null
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


        // Initialize payment with gateway
        const { getPaymentGateway } = await import('@/lib/payment-gateways');
        const paymentGateway = getPaymentGateway(gateway.toLowerCase());

        // Payment gateway will handle currency conversion internally
        const startGateway = Date.now();
        const paymentResponse = await paymentGateway.createOrder({
            orderId: order.order_id,
            amount: finalAmount, // USD amount - gateway converts if needed
            currency: 'USD', // Always pass USD
            customerEmail: customerEmail || user.email || profile?.email || 'noemail@sharkfunded.com',
            customerName: customerName || profile?.full_name || 'Trader',
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
// Helper function to calculate price in USD
// Helper function to calculate price in USD
async function calculatePrice(type: string, model: string, size: string, supabase: any): Promise<number> {
    const sizeNum = Number(size);
    const sizeKey = sizeNum >= 1000 ? `${sizeNum / 1000}K` : `${sizeNum}`;
    const p = (val: string) => parseInt(val.replace('$', ''));

    // Determine Config Key matches frontend logic
    let configKey = '';
    const normalizedModel = (model === 'standard' || model === 'lite') ? 'lite' : 'prime';

    if (type === 'instant') {
        configKey = normalizedModel === 'prime' ? 'InstantPrime' : 'InstantLite';
    } else if (normalizedModel === 'prime') {
        configKey = 'Prime';
    } else {
        if (type === '1-step') configKey = 'LiteOneStep';
        else if (type === '2-step') configKey = 'LiteTwoStep';
    }

    // Try to fetch dynamic config
    try {
        const { data } = await supabase
            .from('pricing_configurations')
            .select('config')
            .eq('key', 'global_pricing')
            .single();

        if (data?.config && data.config[configKey]) {
            const sizeSort = data.config[configKey][sizeKey];
            if (sizeSort && sizeSort.price) {
                return p(sizeSort.price);
            }
        }
    } catch (e) {
        console.warn("Failed to fetch dynamic pricing, using fallback", e);
    }

    // FALLBACK (Hardcoded defaults if DB fails)
    if (model === 'prime') {
        if (type === 'instant') {
            switch (sizeKey) {
                case '5K': return p('$49');
                case '10K': return p('$83');
                case '25K': return p('$199');
                case '50K': return p('$350');
                case '100K': return p('$487');
            }
        } else {
            // Prime
            switch (sizeKey) {
                case '5K': return p('$59');
                case '10K': return p('$89');
                case '25K': return p('$236');
                case '50K': return p('$412');
                case '100K': return p('$610');
            }
        }
    }
    else {
        if (type === 'instant') {
            switch (sizeKey) {
                case '3K': return p('$34');
                case '6K': return p('$59');
                case '12K': return p('$89');
                case '25K': return p('$249');
                case '50K': return p('$499');
                case '100K': return p('$799');
            }
        } else if (type === '1-step') {
            switch (sizeKey) {
                case '5K': return p('$48');
                case '10K': return p('$70');
                case '25K': return p('$150');
                case '50K': return p('$260');
                case '100K': return p('$550');
            }
        } else if (type === '2-step') {
            switch (sizeKey) {
                case '5K': return p('$30');
                case '10K': return p('$55');
                case '25K': return p('$125');
                case '50K': return p('$235');
                case '100K': return p('$440');
            }
        }
    }

    return 9999;
}
