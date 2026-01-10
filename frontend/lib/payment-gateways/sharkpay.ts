import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';

export class SharkPayGateway implements PaymentGateway {
    name = 'sharkpay';
    private keyId: string;
    private keySecret: string;
    private apiUrl: string;

    constructor() {
        this.keyId = process.env.SHARKPAY_API_KEY || '';
        this.keySecret = process.env.SHARKPAY_API_SECRET || '';
        this.apiUrl = process.env.SHARKPAY_API_URL || '';
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            // Convert USD to INR for SharkPay
            const amountINR = await this.convertToINR(params.amount);

            // Use FRONTEND_URL (ngrok) if available, otherwise fallback to local
            const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

            // SharkPay API payload (exact format from docs)
            const payload = {
                amount: amountINR, // Amount in INR
                name: params.customerName,
                email: params.customerEmail,
                reference_id: params.orderId, // Our internal order ID
                success_url: `${baseUrl}/payment/success`,
                failed_url: `${baseUrl}/payment/failed`,
                callback_url: `${baseUrl}/api/webhooks/payment`,
            };

            console.log('SharkPay request:', { ...payload, amount: amountINR });

            const response = await fetch(`${this.apiUrl}/api/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('SharkPay API error:', response.status, errorText);
                throw new Error(`SharkPay API failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            console.log('SharkPay response:', data);

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

            const webhookSecret = process.env.SHARKPAY_WEBHOOK_SECRET || '';
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
        // Simple Fixed Calculation: USD * 84
        const USD_TO_INR = 92;
        return Math.round(usdAmount * USD_TO_INR);
    }
}
