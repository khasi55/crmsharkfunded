const MT5_BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'http://localhost:5001';
const MT5_BRIDGE_API_KEY = process.env.MT5_BRIDGE_API_KEY;

if (!MT5_BRIDGE_API_KEY) {
    console.warn('⚠️ MT5_BRIDGE_API_KEY not set in environment! Bridge calls might fail if auth is enabled.');
}

export class MT5BridgeError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public details?: any
    ) {
        super(message);
        this.name = 'MT5BridgeError';
    }
}

async function callBridge<T = any>(
    endpoint: string,
    data?: any,
    method: 'GET' | 'POST' = 'POST'
): Promise<T> {
    // Remove trailing slash from base and leading from endpoint to avoid double slash
    const baseUrl = MT5_BRIDGE_URL.replace(/\/$/, '');
    const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(MT5_BRIDGE_API_KEY ? { 'X-API-Key': MT5_BRIDGE_API_KEY } : {}),
        },
    };

    if (data && method === 'POST') {
        options.body = JSON.stringify(data);
    }

    // console.log(`🌉 Bridge Call: ${method} ${url}`);

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            let errorDetails = {};
            try {
                errorDetails = await response.json();
            } catch (e) {
                errorDetails = { text: await response.text() };
            }

            throw new MT5BridgeError(
                (errorDetails as any).detail || `MT5 Bridge request failed: ${response.statusText}`,
                response.status,
                errorDetails
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof MT5BridgeError) {
            throw error;
        }
        throw new MT5BridgeError(
            `Failed to connect to MT5 Bridge: ${error instanceof Error ? error.message : 'Unknown error'}`,
            500,
            error
        );
    }
}

// Export typed API methods
export const mt5Bridge = {
    // Health check
    health: () => callBridge<{
        status: string;
        connected: boolean;
        server: string;
        port: string;
        timestamp: string;
    }>('/health', undefined, 'GET').catch(e => ({ status: 'error', connected: false, error: e.message })),

    // Create account
    createAccount: (data: {
        name: string;
        email: string;
        group: string;
        leverage: number;
        balance: number;
    }) => callBridge<{
        login: number;
        password: string;
        investor_password: string;
        group: string;
    }>('/create-account', data),

    // Deposit funds
    deposit: (data: {
        login: number;
        amount: number;
        comment?: string;
    }) => callBridge<{
        status: string;
        message: string;
    }>('/deposit', data),

    // Fetch trades
    fetchTrades: (data: {
        login: number;
        incremental?: boolean;
    }) => callBridge<{
        trades: Array<{
            login: number;
            ticket: number;
            symbol: string;
            type: number;
            volume: number;
            price: number;
            close_price: number;
            profit: number;
            commission: number;
            swap: number;
            time: number;
            close_time: number | null;
            duration: number | null;
            is_closed: boolean;
        }>;
    }>('/fetch-trades', data),

    // Bulk equity check (risk monitoring)
    checkBulk: (requests: Array<{
        login: number;
        min_equity_limit: number;
        disable_account?: boolean;
        close_positions?: boolean;
    }>) => callBridge<Array<{
        login: number;
        status: 'SAFE' | 'FAILED';
        equity: number;
        balance: number;
        actions?: string[];
    }>>('/check-bulk', requests),

    // Disable account
    disableAccount: (login: number) => callBridge<{
        status: string;
        message: string;
    }>('/disable-account', { login }),

    // Stop out account
    stopOutAccount: (login: number) => callBridge<{
        status: string;
        positions_closed: number;
        orders_closed: number;
        account_disabled: boolean;
    }>('/stop-out-account', { login }),

    // Reload config (admin only)
    reloadConfig: () => callBridge<{
        status: string;
        message: string;
    }>('/reload-config', {}),
};
