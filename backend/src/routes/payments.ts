import { Router, Request, Response } from 'express';
import { paymentGatewayRegistry } from '../services/payment-gateways';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/payments/create-order
 * Create a payment order through the specified gateway
 * REQUIRES AUTHENTICATION
 */
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
    try {
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
            customerEmail
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
            hasPaymentUrl: !!result.paymentUrl
        });

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
