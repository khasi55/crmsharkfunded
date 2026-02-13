import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export class CregisGateway implements PaymentGateway {
    name = 'cregis';
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.CREGIS_API_URL || 'https://api.cregis.com/v1';
    }

    private async getConfig() {
        try {
            if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const { data } = await supabase
                    .from('merchant_config')
                    .select('*')
                    .eq('gateway_name', 'Cregis')
                    .single();

                if (data && data.is_active) {
                    return {
                        apiKey: data.api_key,
                        apiSecret: data.api_secret,
                        webhookSecret: data.webhook_secret,
                        businessId: data.metadata?.business_id || process.env.CREGIS_BUSINESS_ID
                    };
                }
            }
        } catch (e) {
            console.warn("Failed to fetch Cregis config from DB, falling back to ENV:", e);
        }

        return {
            apiKey: process.env.CREGIS_API_KEY || '',
            apiSecret: process.env.CREGIS_API_SECRET || '',
            webhookSecret: process.env.CREGIS_WEBHOOK_SECRET || '',
            businessId: process.env.CREGIS_BUSINESS_ID || ''
        };
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const config = await this.getConfig();
            if (!config.apiKey || !config.apiSecret) {
                throw new Error("Cregis API Credentials missing");
            }

            // Payloads for Cregis typically involve a signature
            const timestamp = Math.floor(Date.now() / 1000);
            const payload = {
                business_id: config.businessId,
                out_order_id: params.orderId,
                amount: params.amount.toString(),
                currency: params.currency,
                callback_url: `${process.env.BACKEND_URL}/api/webhooks/cregis`,
                timestamp
            };

            // Simplified signature logic - adjusted based on standard Cregis patterns
            const signature = this.generateSignature(payload, config.apiSecret);

            const response = await fetch(`${this.apiUrl}/order/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': config.apiKey,
                    'X-SIGNATURE': signature
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Cregis API failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as any;

            return {
                success: true,
                gatewayOrderId: data.order_id || data.tid,
                paymentUrl: data.payment_url || data.url
            };
        } catch (error: any) {
            console.error('Cregis createOrder error:', error);
            return {
                success: false,
                gatewayOrderId: '',
                error: error.message
            };
        }
    }

    async verifyWebhook(headers: any, body: any): Promise<boolean> {
        try {
            const signature = headers['x-cregis-signature'];
            if (!signature) return false;

            const config = await this.getConfig();
            const expectedSignature = this.generateSignature(body, config.apiSecret);

            return signature === expectedSignature;
        } catch (error) {
            console.error('Cregis webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        return {
            orderId: body.out_order_id,
            paymentId: body.order_id || body.tid,
            status: body.status === 'success' ? 'success' : 'failed',
            amount: Number(body.amount),
            paymentMethod: 'crypto',
            metadata: {
                chain: body.chain,
                currency: body.currency,
                txid: body.txid
            }
        };
    }

    private generateSignature(payload: any, secret: string): string {
        // Sort keys and join
        const keys = Object.keys(payload).sort();
        const str = keys.map(k => `${k}=${payload[k]}`).join('&') + `&key=${secret}`;
        return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
    }
}
