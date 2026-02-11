// Payment Gateway Interface
export interface PaymentGateway {
    name: string;
    createOrder(params: CreateOrderParams): Promise<CreateOrderResponse>;
    verifyWebhook(headers: any, body: any): Promise<boolean>;
    parseWebhookData(body: any): WebhookData;
}

export interface CreateOrderParams {
    orderId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    metadata?: Record<string, any>;
}

export interface CreateOrderResponse {
    success: boolean;
    gatewayOrderId: string;
    paymentUrl?: string;
    error?: string;
}

export interface WebhookData {
    orderId: string;
    paymentId: string;
    status: 'success' | 'failed' | 'pending';
    amount: number;
    paymentMethod?: string;
    metadata?: Record<string, any>;
}
