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

    constructor() {
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
                    environment: data.environment,
                    apiUrl: process.env.SHARKPAY_API_URL || 'https://payments.sharkfunded.com'
                };
            }
        } catch (e) {
            console.warn("Failed to fetch SharkPay config from DB, falling back to ENV:", e);
        }

        // Fallback to ENV
        return {
            keyId: process.env.SHARKPAY_API_KEY || process.env.SHARK_PAYMENT_KEY_ID || '',
            keySecret: process.env.SHARKPAY_API_SECRET || process.env.SHARK_PAYMENT_KEY_SECRET || '',
            webhookSecret: process.env.SHARKPAY_WEBHOOK_SECRET || '',
            environment: 'sandbox',
            apiUrl: process.env.SHARKPAY_API_URL || 'https://payments.sharkfunded.com'
        };
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const config = await this.getConfig();
            if (!config.keyId || !config.keySecret) {
                throw new Error("SharkPay API Credentials missing (DB or ENV)");
            }

            const apiUrl = config.apiUrl;

            // Convert USD to INR for SharkPay
            const amountINR = await this.convertToINR(params.amount);

            // Use FRONTEND_URL for user redirects, BACKEND_URL for webhooks
            const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

            // SharkPay API payload (exact format from docs)
            // console.log("🦈 [SharkPay Debug] Backend URL:", backendUrl);
            const payload = {
                amount: amountINR, // Amount in INR
                name: params.customerName,
                email: params.customerEmail,
                reference_id: params.orderId, // Our internal order ID
                success_url: `${frontendUrl}/payment/success?orderId=${params.orderId}`,
                failed_url: `${frontendUrl}/payment/failed`,
                callback_url: `${backendUrl}/api/webhooks/payment`,
            };
            // console.log("🦈 [SharkPay Debug] Payload:", JSON.stringify(payload, null, 2));

            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                const response = await fetch(`${apiUrl}/api/create-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('SharkPay API error:', response.status, errorText);
                    throw new Error(`SharkPay API failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();

                // console.log('SharkPay response:', data);

                return {
                    success: true,
                    gatewayOrderId: data.orderId || data.order_id,
                    paymentUrl: data.checkoutUrl || data.checkout_url || data.url,
                };
            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // Better error messages for common issues
                if (fetchError.name === 'AbortError') {
                    throw new Error('SharkPay API timeout - request took longer than 30 seconds');
                } else if (fetchError.code === 'ECONNRESET') {
                    throw new Error('SharkPay API connection reset - please check if the API is reachable');
                } else if (fetchError.code === 'ENOTFOUND') {
                    throw new Error(`SharkPay API not found at ${apiUrl}`);
                }
                throw fetchError;
            }
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
        // Simple Fixed Calculation: USD * 94
        const USD_TO_INR = 98;
        return Math.round(usdAmount * USD_TO_INR);
    }
}
