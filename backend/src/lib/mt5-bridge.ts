// Native fetch is used (Node.js 18+)

export interface MT5AccountParams {
    name: string;
    email: string;
    group: string;
    leverage: number;
    balance: number;
    callback_url?: string;
}

export async function createMT5Account(params: MT5AccountParams) {
    // Use BRIDGE_URL (Internal/Local) if set, otherwise API_URL (Public/Ngrok)
    const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'http://localhost:8000';

    const response = await fetch(`${mt5ApiUrl}/create-account`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'X-API-Key': process.env.MT5_API_KEY || ''
        },
        body: JSON.stringify(params)
    });

    if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.detail || 'Failed to create MT5 account via bridge');
    }

    return await response.json() as any;
}

export async function fetchMT5Trades(login: number) {
    const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';

    try {
        const url = `${mt5ApiUrl}/fetch-trades`;
        // console.log(`🔌 [Bridge Debug] Fetching from: ${url}`); // Spam reduction
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-API-Key': process.env.MT5_API_KEY || ''
            },
            body: JSON.stringify({ login })
        });

        if (!response.ok) {
            console.error(`Bridge fetch failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json() as { trades: any[] };
        if (!data) return [];
        return data.trades || [];
    } catch (error) {
        console.error("Error fetching trades from bridge:", error);
        return [];
    }
}

export async function fetchMT5History(login: number, fromTimestamp?: number) {
    const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';

    try {
        // Default to last 7 days if no timestamp provided
        const from = fromTimestamp || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        const to = Math.floor(Date.now() / 1000);

        const response = await fetch(`${mt5ApiUrl}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-API-Key': process.env.MT5_API_KEY || ''
            },
            body: JSON.stringify({ login, from, to })
        });

        if (!response.ok) {
            console.error(`Bridge history fetch failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json() as { trades: any[] };
        return data.trades || [];
    } catch (error) {
        console.error("Error fetching history from bridge:", error);
        return [];
    }
}
