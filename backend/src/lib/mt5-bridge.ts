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
    const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';

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
        let errorMsg = 'Failed to create MT5 account via bridge';
        try {
            const errorData = await response.json() as any;
            errorMsg = errorData.detail || errorMsg;
        } catch (e) {
            // If JSON parse fails, it's likely an HTML error page (502/504/524)
            const text = await response.text().catch(() => 'No response body');
            errorMsg = `Bridge Error ${response.status}: ${text.substring(0, 200)}...`;
        }
        throw new Error(errorMsg);
    }

    return await response.json() as any;
}

export async function fetchMT5Trades(login: number) {
    const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';

    try {
        const url = `${mt5ApiUrl}/fetch-trades`;
        // console.log(`🔌 [Bridge Debug] Fetching from: ${url}`); // Spam reduction
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s Timeout (Increased for Heavy Accounts)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-API-Key': process.env.MT5_API_KEY || ''
            },
            body: JSON.stringify({ login }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.error(`Bridge fetch failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json() as { trades: any[] };
        if (!data) return [];
        return data.trades || [];
    } catch (error: any) {
        if (error.name === 'AbortError') {
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.warn(`⏳ [Bridge Timeout] Request for ${login} aborted (60s limit exceeded)`);
        } else {
            console.error(`❌ Error fetching trades for ${login}:`, error.message);
        }
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
            const DEBUG = process.env.DEBUG === 'true';
            if (DEBUG) console.error(`Bridge history fetch failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json() as { trades: any[] };
        return data.trades || [];
    } catch (error) {
        const DEBUG = process.env.DEBUG === 'true';
        if (DEBUG) console.error("Error fetching history from bridge:", error);
        return [];
    }
}

export async function disableMT5Account(login: number) {
    const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';

    const response = await fetch(`${mt5ApiUrl}/disable-account`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.MT5_API_KEY || ''
        },
        body: JSON.stringify({ login: Number(login) })
    });

    if (!response.ok) {
        const errText = await response.text();
        // If 404, we consider it already "disabled" or missing, which is fine for our cleanup
        if (response.status !== 404) {
            throw new Error(`Bridge error: ${errText}`);
        }
    }

    return { success: true };
}
