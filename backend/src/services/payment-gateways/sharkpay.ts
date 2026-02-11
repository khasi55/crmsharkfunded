import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class SharkPayGateway implements PaymentGateway {
    name = 'sharkpay';
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.SHARKPAY_API_URL || 'https://sharkpay-o9zz.vercel.app';
    }

    private async getConfig() {
        // Fetch from DB first
        try {
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
            keyId: process.env.SHARKPAY_API_KEY || process.env.SHARK_PAYMENT_KEY_ID || '',
            keySecret: process.env.SHARKPAY_API_SECRET || process.env.SHARK_PAYMENT_KEY_SECRET || '',
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

            // Frontend and backend URLs
            const frontendUrl = process.env.FRONTEND_URL || 'https://app.sharkfunded.com';
            const backendUrl = process.env.BACKEND_URL || 'https://api.sharkfunded.co';

            const payload = {
                amount: amountINR,
                name: params.customerName,
                email: params.customerEmail,
                reference_id: params.orderId,
                success_url: `${frontendUrl}/payment/success?orderId=${params.orderId}`,
                failed_url: `${frontendUrl}/payment/failed`,
                callback_url: `${backendUrl}/api/webhooks/payment`,
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(`${this.apiUrl}/api/create-order`, {
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

                const data = await response.json() as any;

                return {
                    success: true,
                    gatewayOrderId: data.orderId || data.order_id,
                    paymentUrl: data.checkoutUrl || data.checkout_url || data.url,
                };
            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                if (fetchError.name === 'AbortError') {
                    throw new Error('SharkPay API timeout - request took longer than 30 seconds');
                } else if (fetchError.code === 'ECONNRESET') {
                    throw new Error('SharkPay API connection reset - please check if the API is reachable');
                } else if (fetchError.code === 'ENOTFOUND') {
                    throw new Error(`SharkPay API not found at ${this.apiUrl}`);
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

    async verifyWebhook(headers: any, body: any): Promise<boolean> {
        try {
            const signature = headers['x-sharkpay-signature'];
            if (!signature) return false;

            const config = await this.getConfig();
            const webhookSecret = config.webhookSecret;
            if (!webhookSecret) return true;

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
        return {
            orderId: body.reference_id,
            paymentId: body.orderId,
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
        const USD_TO_INR = 94;
        return Math.round(usdAmount * USD_TO_INR);
    }
}
