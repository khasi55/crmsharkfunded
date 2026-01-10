export interface Mt5ConnectionRequest {
    host: string;
    port: number;
    user?: string;
    password?: string;
}

export interface Mt5ConnectionResponse {
    id: string; // token/session id
    success: boolean;
    message?: string;
}

export interface Mt5AccountSummary {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    marginLevel: number;
    currency: string;
    leverage: number;
    name: string;
    login: number;
}

export interface Mt5Order {
    ticket: number;
    symbol: string;
    type: 'buy' | 'sell';
    lots: number;
    openPrice: number;
    closePrice: number;
    openTime: string;
    closeTime?: string;
    profit: number;
    commission: number;
    swap: number;
    stopLoss: number;
    takeProfit: number;
}
