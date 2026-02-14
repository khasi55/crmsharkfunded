import { Router, Request, Response } from 'express';
import { paymentGatewayRegistry } from '../services/payment-gateways';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/payments/create-order
 * Create a payment order through the specified gateway
 * REQUIRES AUTHENTICATION
 */
router.post('/create-order', async (req: Request, res: Response) => {
    try {
        // Optional Authentication
        let user = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const { data: { user: authUser } } = await supabase.auth.getUser(token);
                user = authUser;
            }
        }

        const {
            gateway,
            orderId,
            amount,
            currency,
            customerEmail,
            customerName,
            metadata
        } = req.body;

        // Validation
        if (!gateway || !orderId || !amount || !currency || !customerEmail || !customerName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: gateway, orderId, amount, currency, customerEmail, customerName'
            });
        }

        // Get gateway instance
        const paymentGateway = paymentGatewayRegistry.getGateway(gateway);
        if (!paymentGateway) {
            return res.status(400).json({
                success: false,
                error: `Unsupported payment gateway: ${gateway}. Available: ${paymentGatewayRegistry.getAllGateways().join(', ')}`
            });
        }

        console.log(`[Payment API] Creating order for ${gateway}:`, {
            orderId,
            amount,
            currency,
            customerEmail,
            isAuthenticated: !!user
        });

        // Create order via gateway
        const result = await paymentGateway.createOrder({
            orderId,
            amount,
            currency,
            customerEmail,
            customerName,
            metadata
        });

        if (!result.success) {
            console.error(`[Payment API] Order creation failed:`, result.error);
            return res.status(500).json({
                success: false,
                error: result.error || 'Payment order creation failed'
            });
        }

        console.log(`[Payment API] Order created successfully:`, {
            gateway,
            gatewayOrderId: result.gatewayOrderId,
            paymentUrl: result.paymentUrl
        });

        // Resolve account_type_id based on model and type
        let accountTypeId: number | null = null;
        let model = (metadata?.model || '').toLowerCase();
        let type = (metadata?.type || '').toLowerCase();
        const size = metadata?.size || metadata?.account_size || 0;

        // Fallback if metadata comes from ChallengeConfigurator format (e.g. account_type: "2-step-lite")
        if (!model && !type && metadata?.account_type) {
            const at = metadata.account_type.toLowerCase();
            if (at.includes('instant')) type = 'instant';
            else if (at.includes('1-step')) type = '1-step';
            else if (at.includes('2-step')) type = '2-step';

            if (at.includes('lite')) model = 'lite';
            else if (at.includes('prime')) model = 'prime';
        }

        if (model === 'lite') {
            if (type === 'instant') accountTypeId = 1;
            else if (type === '1-step') accountTypeId = 2;
            else if (type === '2-step') accountTypeId = 3;
        } else if (model === 'prime') {
            if (type === 'instant') accountTypeId = 5;
            else if (type === '1-step') accountTypeId = 6;
            else if (type === '2-step') accountTypeId = 7;
        }

        // Insert into database (Handle optional user_id)
        const { error: dbError } = await supabase.from('payment_orders').insert({
            user_id: user?.id || null, // Allow null for guest checkout
            order_id: orderId,
            amount: amount,
            currency: currency,
            status: 'pending',
            account_type_name: `${model || ''} ${type || ''}`.trim() || 'Challenge',
            account_type_id: accountTypeId,
            account_size: size,
            platform: metadata?.platform || 'MT5',
            model: model || 'lite',
            payment_gateway: gateway,
            payment_id: result.gatewayOrderId,
            coupon_code: metadata?.coupon,
            metadata: {
                ...(metadata || {}),
                customerName,
                customerEmail
            }
        });

        if (dbError) {
            console.error('[Payment API] Database insertion failed:', dbError);
            // We don't fail the request here because the gateway order is already created,
            // but we log it as a critical error.
        }

        return res.json({
            success: true,
            gatewayOrderId: result.gatewayOrderId,
            paymentUrl: result.paymentUrl
        });

    } catch (error: any) {
        console.error('[Payment API] Unexpected error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * GET /api/payments/gateways
 * List all available payment gateways
 */
router.get('/gateways', (req: Request, res: Response) => {
    return res.json({
        success: true,
        gateways: paymentGatewayRegistry.getAllGateways()
    });
});

export default router;
