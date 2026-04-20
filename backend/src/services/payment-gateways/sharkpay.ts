import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';
import { supabase } from '../../lib/supabase';

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

            // Frontend and backend URLs
            const frontendUrl = process.env.FRONTEND_URL || 'https://app.sharkfunded.com';
            const backendUrl = process.env.BACKEND_URL || 'https://api.sharkfunded.co';
            // 🛡️ SECURITY: Use a per-order signature that includes the expected status, currency, and a one-time nonce
            const masterWebhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'shark_secret_fallback';
            const nonce = params.metadata?.webhook_nonce || '';
            // We lock the signature to the orderId + status + currency + nonce
            const signature = crypto.createHmac('sha256', masterWebhookSecret).update(`${params.orderId}:paid:${params.currency}:${nonce}`).digest('hex');
            const webhookUrl = `${backendUrl}/api/webhooks/payment?gateway=sharkpay&sig=${signature}${nonce ? `&nonce=${nonce}` : ''}`;

            const payload = {
                amount: amountINR,
                name: params.customerName,
                email: params.customerEmail,
                reference_id: params.orderId,
                success_url: `${frontendUrl}/payment/success?orderId=${params.orderId}`,
                failed_url: `${frontendUrl}/payment/failed`,
                callback_url: webhookUrl,
            };

            console.log('[SharkPay Debug] Sending Payload:', JSON.stringify(payload, null, 2));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

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
            const config = await this.getConfig();
            const webhookSecret = config.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET;
            
            if (!webhookSecret) {
                console.warn('[SharkPay] No webhook secret found for verification');
                return false;
            }

            const receivedSignature = headers['x-shark-signature'] || headers['x-signature'];
 
            // 🛡️ FALLBACK: If no signature header, check for per-order HMAC signature in body/query
            if (!receivedSignature) {
                const receivedSig = body.sig;
                const orderId = body.reference_id || body.order_id;
                
                if (receivedSig && orderId && webhookSecret) {
                    const receivedNonce = String(body.nonce || '');
                    
                    // 🛡️ ONE-TIME NONCE VERIFICATION
                    // Fetch the stored nonce from the database to ensure it's a one-time use link
                    const { data: orderData } = await supabase
                        .from('payment_orders')
                        .select('metadata')
                        .eq('order_id', orderId)
                        .single();
                    
                    const storedNonce = orderData?.metadata?.webhook_nonce || '';
                    
                    if (!storedNonce || storedNonce !== receivedNonce) {
                        console.warn(`[SharkPay] Nonce mismatch or already used for ${orderId}`);
                        return false;
                    }

                    // Re-calculate the expected signature using the nonce
                    const currency = body.currency || 'USD';
                    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(`${orderId}:paid:${currency}:${storedNonce}`).digest('hex');
                    
                    if (receivedSig === expectedSig) {
                        console.log(`[SharkPay] Webhook verified via per-order signature and nonce for ${orderId}`);
                        
                        // 🛡️ INVALIDATE NONCE: Clear it from the database so it can't be used again
                        if (orderData) {
                            await supabase
                                .from('payment_orders')
                                .update({ 
                                    metadata: { 
                                        ...orderData.metadata, 
                                        webhook_nonce: null 
                                    } 
                                })
                                .eq('order_id', orderId);
                        }
                            
                        return true;
                    }
                }
                console.warn('[SharkPay] No valid signature or token found');
                return false;
            }

            // Generate expected signature
            const hmac = crypto.createHmac('sha256', webhookSecret);
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            const expectedSignature = hmac.update(bodyStr).digest('hex');

            const receivedBuf = Buffer.from(receivedSignature);
            const expectedBuf = Buffer.from(expectedSignature);

            if (receivedBuf.length !== expectedBuf.length) return false;

            const isValid = crypto.timingSafeEqual(receivedBuf, expectedBuf);

            if (!isValid) {
                console.warn('[SharkPay] Invalid webhook signature detected');
            }

            return isValid;
        } catch (error) {
            console.error('[SharkPay] Webhook verification error:', error);
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
        const USD_TO_INR = 98;
        return Math.round(usdAmount * USD_TO_INR);
    }
}
