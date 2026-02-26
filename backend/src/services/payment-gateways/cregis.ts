import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';
import { supabase } from '../../lib/supabase';

export class CregisGateway implements PaymentGateway {
    name = 'cregis';
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.CREGIS_API_URL || 'https://api.cregis.com/v1';
    }

    private async getConfig() {
        try {
            const { data } = await supabase
                .from('merchant_config')
                .select('*')
                .eq('gateway_name', 'Cregis')
                .single();

            if (data && data.is_active) {
                return {
                    apiKey: data.api_key,
                    projectId: data.metadata?.project_id || process.env.CREGIS_PROJECT_ID,
                    webhookSecret: data.webhook_secret
                };
            }
        } catch (e) {
            console.warn("Failed to fetch Cregis config from DB, falling back to ENV:", e);
        }

        return {
            apiKey: process.env.CREGIS_API_KEY || '',
            projectId: process.env.CREGIS_PROJECT_ID || '',
            webhookSecret: process.env.CREGIS_WEBHOOK_SECRET || ''
        };
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const config = await this.getConfig();
            if (!config.apiKey || !config.projectId) {
                throw new Error("Cregis API Credentials (Key/ProjectID) missing");
            }

            // Payloads for Cregis typically involve a signature
            // const timestamp = Math.floor(Date.now() / 1000);

            const payload: any = {
                pid: config.projectId,
                timestamp: Date.now(), // 13-digit Unix timestamp (ms)
                nonce: Math.random().toString(36).substring(2, 8), // 6-char nonce
                order_id: params.orderId,
                order_amount: params.amount.toString(),
                order_currency: params.currency,
                callback_url: `${process.env.BACKEND_URL}/api/webhooks/cregis`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/failed`,
                success_url: `${process.env.FRONTEND_URL}/payment/success`,
                payer_email: params.customerEmail,
                payer_name: params.customerName || 'Customer',
                payer_id: params.customerEmail, // Using email as unique payer ID
                valid_time: 60,
                remark: `Order ${params.orderId}`
            };

            // Sign the payload
            payload.sign = this.generateSignature(payload, config.apiKey); // API Key is used as secret

            const requestUrl = `${this.apiUrl}/api/v2/checkout`;
            const requestHeaders = {
                'Content-Type': 'application/json',
                // 'X-API-Key': config.apiKey // Try removing if signature is enough, or keep.
                // Some APIs only want signature invalidating key if sent as header too.
                // Re-adding X-API-Key as it is standard.
                'token': config.apiKey // Reverting to 'token' based on some docs, or trying both/standard
            };

            console.log('[Cregis Debug] Requesting:', {
                url: requestUrl,
                headers: requestHeaders,
                payload: payload
            });

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Cregis API Error (${response.status}):`, errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(`Cregis API failed: ${errorJson.msg || errorJson.message || response.statusText}`);
                } catch (e) {
                    throw new Error(`Cregis API failed: ${response.status} - ${errorText}`);
                }
            }

            const data = await response.json() as any;

            if (data.code !== '00000') { // Check for business logic errors
                throw new Error(`Cregis API Error: ${data.msg || 'Unknown error'}`);
            }

            return {
                success: true,
                gatewayOrderId: data.data?.cregis_id,
                paymentUrl: data.data?.checkout_url
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
            const receivedSign = body.sign;
            if (!receivedSign) return false;

            const config = await this.getConfig();
            const apiKey = config.apiKey;
            if (!apiKey) return false;

            const expectedSign = this.generateSignature(body, apiKey);
            return receivedSign === expectedSign;
        } catch (error) {
            console.error('Cregis webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        const rawStatus = String(body.status || '').toLowerCase();
        const isSuccess = body.status === 1 || rawStatus === 'paid' || rawStatus === 'success' || rawStatus === 'paid_over' || body.event_type === 'paid_over';
        return {
            orderId: body.third_party_id,
            paymentId: body.order_id,
            status: isSuccess ? 'success' : 'failed',
            amount: Number(body.amount),
            paymentMethod: 'crypto',
            metadata: {}
        };
    }
    private generateSignature(payload: any, apiKey: string): string {
        // 1. Filter out 'sign', null, undefined, or empty string values
        const keys = Object.keys(payload).filter(k =>
            k !== 'sign' &&
            payload[k] !== null &&
            payload[k] !== undefined &&
            payload[k] !== ''
        ).sort(); // 2. Sort keys lexicographically

        // 3. Concatenate parameters: key1value1key2value2...
        let paramString = '';
        for (const key of keys) {
            paramString += `${key}${payload[key]}`;
        }

        // 4. Prepend API Key
        const signString = apiKey + paramString;

        console.log('[Cregis Debug] Signature String:', signString); // Debug log

        // 5. Calculate MD5 hash
        return crypto.createHash('md5').update(signString).digest('hex').toLowerCase();
    }
}
