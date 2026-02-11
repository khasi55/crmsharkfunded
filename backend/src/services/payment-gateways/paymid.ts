import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';

export class PaymidGateway implements PaymentGateway {
    name = 'paymid';
    private merchantId: string;
    private apiKey: string;
    private secretKey: string;
    private apiUrl: string;

    constructor() {
        this.merchantId = process.env.PAYMID_MERCHANT_ID || '';
        this.apiKey = process.env.PAYMID_API_KEY || '';
        this.secretKey = process.env.PAYMID_SECRET_KEY || '';
        this.apiUrl = process.env.PAYMID_API_URL || '';
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const [firstName, ...lastNameParts] = params.customerName.split(' ');
            const lastName = lastNameParts.join(' ') || 'N/A';

            const frontendUrl = process.env.FRONTEND_URL || 'https://app.sharkfunded.com';
            const backendUrl = process.env.BACKEND_URL || 'https://api.sharkfunded.co';

            const payload = {
                firstName: firstName,
                middleName: "",
                lastName: lastName,
                reference: params.orderId,
                dob: "1990-01-01",
                email: params.customerEmail,
                contactNumber: "+1234567890",
                address: "N/A",
                country: "United States",
                state: "N/A",
                city: "N/A",
                zipCode: 10001,
                currency: params.currency,
                amount: params.amount,
                ttl: 15,
                tagName: params.metadata?.account_type || "Challenge Purchase",
                merchantAccountId: this.merchantId,
                webhookUrl: `${backendUrl}/api/webhooks/payment`,
                successUrl: `${frontendUrl}/payment/success`,
                failedUrl: `${frontendUrl}/payment/failed`,
            };

            console.log('Paymid request:', { ...payload, amount: params.amount });

            const response = await fetch(`${this.apiUrl}/api/v1/payment/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64')}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Paymid API error:', response.status, errorText);
                throw new Error(`Paymid API failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as any;

            console.log('Paymid response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Paymid payment request failed');
            }

            return {
                success: true,
                gatewayOrderId: params.orderId,
                paymentUrl: data.data?.payment_url,
            };
        } catch (error: any) {
            console.error('Paymid createOrder error:', error);
            return {
                success: false,
                gatewayOrderId: '',
                error: error.message,
            };
        }
    }

    async verifyWebhook(headers: any, body: any): Promise<boolean> {
        try {
            const signature = headers['signature'] || headers['x-paymid-signature'];
            if (!signature) {
                console.warn('Paymid webhook: No signature found');
                return false;
            }

            const sortedKeys = Object.keys(body).sort();
            const sortedPayload: any = {};
            sortedKeys.forEach(key => {
                sortedPayload[key] = body[key];
            });

            const payloadJson = JSON.stringify(sortedPayload);

            const expectedSignature = crypto
                .createHmac('sha256', this.secretKey)
                .update(payloadJson)
                .digest('hex');

            const isValid = signature === expectedSignature;

            if (!isValid) {
                console.error('Paymid webhook signature mismatch');
            }

            return isValid;
        } catch (error) {
            console.error('Paymid webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        return {
            orderId: body.reference,
            paymentId: body.transaction_id,
            status: this.mapStatus(body.status),
            amount: Number(body.amount),
            paymentMethod: body.payment_method || 'unknown',
            metadata: {
                type: body.type,
                created_at: body.created_at,
                processor_name: body.processor_name,
                currency: body.currency,
            },
        };
    }

    private mapStatus(status: string): 'success' | 'failed' | 'pending' {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'success' || statusLower === 'completed' || statusLower === 'approved') {
            return 'success';
        }
        if (statusLower === 'failed' || statusLower === 'declined' || statusLower === 'cancelled') {
            return 'failed';
        }
        return 'pending';
    }
}
