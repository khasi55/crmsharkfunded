import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';

/**
 * Paymentservice.me (EPay) Gateway Implementation v2
 * Docs Ref: Section 1.1 - 1.5, 2.1, 3.1
 * MID: 976697204360081
 */
export class EPayGateway implements PaymentGateway {
    name = 'epay';
    private merchantId: string;
    private apiUrl: string;

    constructor() {
        this.merchantId = process.env.EPAY_MID || '976697204360081';
        this.apiUrl = process.env.EPAY_API_URL || 'https://api.paymentservice.me/v1/stage';
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            // Mapping to EPay's confirmed payload format
            const payload = {
                channelId: "WEB",
                customerId: params.customerEmail,
                merchantId: this.merchantId,
                merchantType: "ECOMMERCE",
                orderID: params.orderId,
                email: params.customerEmail,
                orderDescription: params.metadata?.account_type || "Challenge Purchase",
                orderAmount: params.amount.toString(),
                user_name: params.customerName,
                orderCurrency: params.currency || 'USD',
                // EPay requires valid public URLs (no localhost)
                // Redirect URLs: These should point to app.sharkfunded.com
                success_url: `https://app.sharkfunded.com/payment/success?orderId=${params.orderId}`,
                failure_url: `https://app.sharkfunded.com/payment/failed?orderId=${params.orderId}`,

                // Webhook/Notification URLs: Point to the backend endpoint
                // Sending multiple variants to ensure compatibility with all EPay versions
                webhook_url: `https://api.sharkfunded.co/api/webhooks/payment`,
                notification_url: `https://api.sharkfunded.co/api/webhooks/payment`,
                notificationUrl: `https://api.sharkfunded.co/api/webhooks/payment`,
                callback_url: `https://api.sharkfunded.co/api/webhooks/payment`
            };

            const endpoint = `${this.apiUrl}/create-new-order`;
            console.log(`[EPay] Initiating order at: ${endpoint}`, payload);

            const response = await fetch(endpoint, {
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
            console.log('[EPay] Order Response:', data);

            if (data.status !== 'success' && data.status !== 'ok') {
                throw new Error(data.message || 'EPay order creation failed');
            }

            return {
                success: true,
                gatewayOrderId: params.orderId,
                paymentUrl: data.redirectUrl, // Confirmed field name from docs
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

    /**
     * Manual Status Check
     * Endpoint: /v1/stage/getstatus
     */
    async getStatus(orderId: string): Promise<any> {
        try {
            const response = await fetch(`${this.apiUrl}/getstatus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantId: this.merchantId,
                    orderID: orderId
                }),
            });
            return await response.json();
        } catch (error) {
            console.error('[EPay] getStatus error:', error);
            return null;
        }
    }

    async verifyWebhook(headers: Headers, body: any): Promise<boolean> {
        // Doc doesn't specify HMAC but we verify the MID as a basic integrity check
        try {
            const mid = body.mid || body.merchantId;
            if (!mid || mid !== this.merchantId) {
                console.warn('[EPay] Webhook verification failed: MID mismatch or missing');
                return false;
            }
            return true;
        } catch (error) {
            console.error('[EPay] Webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        // Section 2.1 Mapping
        const statusText = body.transt || 'unknown';
        const isSuccess =
            statusText.toLowerCase() === 'purchased' ||
            statusText.toLowerCase() === 'payment accepted';

        return {
            orderId: body.orderid,
            paymentId: body.transactionid,
            status: isSuccess ? 'success' : 'failed',
            amount: Number(body.tranmt || body.receive_amount),
            paymentMethod: body.cardHolderName ? 'Card' : 'unknown',
            metadata: {
                mid: body.mid,
                cardHolderName: body.cardHolderName,
                cardNumber: body.cardNumber,
                status_text: statusText
            },
        };
    }
}
