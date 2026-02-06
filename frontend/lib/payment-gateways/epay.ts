import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';

/**
 * Paymentservice.me (EPay) Gateway Implementation
 * Docs: Section 1.1 - 1.5, 2.1, 3.1
 */
export class EPayGateway implements PaymentGateway {
    name = 'epay';
    private mid: string;
    private apiUrl: string;

    constructor() {
        this.mid = process.env.EPAY_MID || '1234567910'; // Default Example MID
        this.apiUrl = process.env.EPAY_API_URL || ''; // Should be filled in .env
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            if (!this.apiUrl) {
                throw new Error("EPAY_API_URL is not configured");
            }

            // Payload based on standard payment gateway conventions + doc clues
            const payload = {
                mid: this.mid,
                orderid: params.orderId,
                tranmt: params.amount,
                currency: params.currency || 'USD',
                customerid: params.customerEmail, // Using email as customer ID
                description: params.metadata?.account_type || "Challenge Purchase",
                redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?orderId=${params.orderId}`,
                error_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed?orderId=${params.orderId}`,
            };

            console.log('[EPay] Creating Order:', payload);

            const response = await fetch(`${this.apiUrl}/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[EPay] API error:', response.status, errorText);
                throw new Error(`EPay API failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[EPay] Response:', data);

            // Response typically contains a redirect URL per Section 1.2
            return {
                success: true,
                gatewayOrderId: data.orderid || params.orderId,
                paymentUrl: data.redirect_url || data.url || data.checkoutUrl,
            };
        } catch (error: any) {
            console.error('[EPay] createOrder error:', error);
            return {
                success: false,
                gatewayOrderId: '',
                error: error.message,
            };
        }
    }

    async verifyWebhook(headers: Headers, body: any): Promise<boolean> {
        // The documentation doesn't specify a signature verification algorithm.
        // Usually it's an HMAC or MD5 of the payload fields.
        // For now, we will verify the Merchant ID (mid) as a basic check.
        try {
            if (!body.mid || body.mid !== this.mid) {
                console.warn('[EPay] Webhook verification failed: MID mismatch');
                return false;
            }
            return true;
        } catch (error) {
            console.error('[EPay] Webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        // Mapping based on Section 2.1
        const status = this.mapStatus(body.transt);

        return {
            orderId: body.orderid,
            paymentId: body.transactionid,
            status: status,
            amount: Number(body.tranmt || body.receive_amount),
            paymentMethod: 'CreditCard/Other', // Doc mentions card holder name
            metadata: {
                mid: body.mid,
                cardHolderName: body.cardHolderName,
                cardNumber: body.cardNumber,
                status_text: body.transt
            },
        };
    }

    private mapStatus(transt: string): 'success' | 'failed' | 'pending' {
        const transtLower = transt?.toLowerCase();

        // Accepted Statuses per Section 6.1/6.2
        if (transtLower === 'purchased' || transtLower === 'payment accepted') {
            return 'success';
        }

        // Error Statuses
        if (
            transtLower === 'partially refunded' ||
            transtLower === 'refunded' ||
            transtLower === 'declined' ||
            transtLower === '3ds not authenticated' ||
            transtLower === 'failed' ||
            transtLower === 'three ds not authenticated' ||
            transtLower === 'three ds not auth'
        ) {
            return 'failed';
        }

        return 'pending';
    }
}
