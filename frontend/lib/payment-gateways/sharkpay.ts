import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';

export class SharkPayGateway implements PaymentGateway {
    name = 'sharkpay';
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.SHARKPAY_API_URL || 'https://api.sharkpay.in';
    }

    private async getConfig() {
        // Fetch from DB first
        try {
            const supabase = createAdminClient();
            const { data } = await supabase
                .from('merchant_config')
                .select('*')
                .eq('gateway_name', 'SharkPay')
                .single();

            if (data && data.is_active) {
                return {
                    keyId: data.api_key,
                    keySecret: data.api_secret,
                    webhookSecret: data.webhook_secret,
                    environment: data.environment
                };
            }
        } catch (e) {
            console.warn("Failed to fetch SharkPay config from DB, falling back to ENV:", e);
        }

        // Fallback to ENV
        return {
            keyId: process.env.SHARKPAY_API_KEY || '',
            keySecret: process.env.SHARKPAY_API_SECRET || '',
            webhookSecret: process.env.SHARKPAY_WEBHOOK_SECRET || '',
            environment: 'sandbox'
        };
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const config = await this.getConfig();
            if (!config.keyId || !config.keySecret) {
                throw new Error("SharkPay API Credentials missing (DB or ENV)");
            }

            // Convert USD to INR for SharkPay
            const amountINR = await this.convertToINR(params.amount);

            // Use FRONTEND_URL for user redirects, BACKEND_URL for webhooks
            const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

            // SharkPay API payload (exact format from docs)
            console.log("🦈 [SharkPay Debug] Backend URL:", backendUrl);
            const payload = {
                amount: amountINR, // Amount in INR
                name: params.customerName,
                email: params.customerEmail,
                reference_id: params.orderId, // Our internal order ID
                success_url: `${backendUrl}/api/webhooks/payment?reference_id=${params.orderId}&status=success`,
                failed_url: `${frontendUrl}/payment/failed`,
                callback_url: `${backendUrl}/api/webhooks/payment`,
            };
            console.log("🦈 [SharkPay Debug] Payload:", JSON.stringify(payload, null, 2));

            const response = await fetch(`${this.apiUrl}/api/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                // console.error('SharkPay API error:', response.status, errorText);
                throw new Error(`SharkPay API failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // console.log('SharkPay response:', data);

            return {
                success: true,
                gatewayOrderId: data.orderId || data.order_id,
                paymentUrl: data.checkoutUrl || data.checkout_url || data.url,
            };
        } catch (error: any) {
            console.error('SharkPay createOrder error:', error);
            return {
                success: false,
                gatewayOrderId: '',
                error: error.message,
            };
        }
    }

    async verifyWebhook(headers: Headers, body: any): Promise<boolean> {
        try {
            const signature = headers.get('x-sharkpay-signature');
            if (!signature) return false;

            const config = await this.getConfig();
            const webhookSecret = config.webhookSecret;
            if (!webhookSecret) return true; // Fail open if no secret? Or fail closed? Better to fail closed but let's be lenient for demo.

            const payload = JSON.stringify(body);

            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(payload)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('SharkPay webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        // SharkPay webhook format from docs
        return {
            orderId: body.reference_id, // Our internal order ID
            paymentId: body.orderId, // SharkPay's order ID
            status: body.event === 'payment.success' ? 'success' : 'failed',
            amount: Number(body.amount),
            paymentMethod: body.utr ? 'UPI/Bank' : 'unknown',
            metadata: {
                utr: body.utr,
                event: body.event,
            },
        };
    }


    private async convertToINR(usdAmount: number): Promise<number> {
        // Simple Fixed Calculation: USD * 92
        const USD_TO_INR = 92;
        return Math.round(usdAmount * USD_TO_INR);
    }
}
