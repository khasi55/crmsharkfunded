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
    private apiUrl: string;

    constructor() {
        this.merchantId = process.env.PAYMID_MERCHANT_ID || '';
        this.apiKey = process.env.PAYMID_API_KEY || '';
        this.apiUrl = process.env.PAYMID_API_URL || '';
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            // Get user profile for additional details
            const [firstName, ...lastNameParts] = params.customerName.split(' ');
            const lastName = lastNameParts.join(' ') || 'N/A';

            // Paymid API payload (exact format from docs)
            const payload = {
                firstName: firstName,
                middleName: "",
                lastName: lastName,
                reference: params.orderId, // Must be 10+ chars, no special chars
                dob: "1990-01-01", // Default DOB
                email: params.customerEmail,
                contactNumber: "+1234567890", // Default
                address: "N/A",
                country: "United States", // Default
                state: "N/A",
                city: "N/A",
                zipCode: 10001,
                currency: params.currency,
                amount: params.amount,
                ttl: 15, // 15 minutes
                tagName: params.metadata?.account_type || "Challenge Purchase",
                merchantAccountId: this.merchantId,
                webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`,
                successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
                failedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
            };

            console.log('Paymid request:', { ...payload, amount: params.amount });

            const response = await fetch(`${this.apiUrl}/api/v1/payment/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${process.env.PAYMID_SECRET_KEY}`).toString('base64')}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Paymid API error:', response.status, errorText);
                throw new Error(`Paymid API failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            console.log('Paymid response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Paymid payment request failed');
            }

            return {
                success: true,
                gatewayOrderId: params.orderId, // Paymid uses our reference
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

    async verifyWebhook(headers: Headers, body: any): Promise<boolean> {
        try {
            const signature = headers.get('signature') || headers.get('x-paymid-signature');
            if (!signature) {
                console.warn('Paymid webhook: No signature found');
                return false;
            }

            const secretKey = process.env.PAYMID_SECRET_KEY || '';

            // Sort payload alphabetically by keys
            const sortedKeys = Object.keys(body).sort();
            const sortedPayload: any = {};
            sortedKeys.forEach(key => {
                sortedPayload[key] = body[key];
            });

            // Convert to JSON string
            const payloadJson = JSON.stringify(sortedPayload);

            // Generate HMAC-SHA256 signature
            const expectedSignature = crypto
                .createHmac('sha256', secretKey)
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
        // Paymid webhook format from docs
        return {
            orderId: body.reference, // Our internal order ID
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
