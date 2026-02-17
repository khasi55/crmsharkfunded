// Simplfied Bridge with Native Fetch and Logging

export interface MT5AccountParams {
    name: string;
    email: string;
    group: string;
    leverage: number;
    balance: number;
    callback_url?: string;
}

const getBridgeUrl = () => process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';
const getApiKey = () => process.env.MT5_API_KEY || '';

async function callBridge(endpoint: string, body: any, method = 'POST') {
    const url = `${getBridgeUrl()}${endpoint}`;
    const start = Date.now();

    // console.log(`🔌 [Bridge] Request: ${method} ${url}`);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': getApiKey(),
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            // Silence 404s as they are common for test/demo accounts and handled by callers
            if (response.status !== 404) {
                console.error(`❌ [Bridge] HTTP Error ${response.status}: ${errText}`);
            }
            throw new Error(`Bridge error: ${errText}`);
        }

        const data = await response.json();
        // console.log(`✅ [Bridge] Success (${Date.now() - start}ms)`);
        return data;
    } catch (error: any) {
        // Only log failures that aren't 404 errors
        if (!error.message.includes('404')) {
            console.error(`❌ [Bridge] ${endpoint} failed:`, error.message);
            if (error.cause) console.error(`❌ [Bridge] Cause:`, error.cause);
        }
        throw error;
    }
}

export async function createMT5Account(params: MT5AccountParams) {
    return await callBridge('/create-account', params);
}

export async function fetchMT5Trades(login: number) {
    try {
        const data = await callBridge('/fetch-trades', { login }) as any;
        return data?.trades || [];
    } catch (error) {
        return [];
    }
}

export async function fetchMT5History(login: number, fromTimestamp?: number) {
    try {
        const from = fromTimestamp || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        const to = Math.floor(Date.now() / 1000);

        // Use fetch-trades instead of history as it returns both open and closed trades
        const data = await callBridge('/fetch-trades', {
            login,
            from,
            to,
            incremental: false
        }) as any;

        return data?.trades || [];
    } catch (error) {
        return [];
    }
}

export async function disableMT5Account(login: number) {
    try {
        await callBridge('/disable-account', { login: Number(login) });
        return { success: true };
    } catch (error: any) {
        if (error.message.includes('404')) return { success: true, warning: 'Account not found' };
        throw error;
    }
}

export async function adjustMT5Balance(login: number, amount: number, comment: string = 'Admin Adjustment') {
    return await callBridge('/adjust-balance', {
        login: Number(login),
        amount: Number(amount),
        comment
    });
}

export async function changeMT5Leverage(login: number, leverage: number) {
    return await callBridge('/change-leverage', {
        login: Number(login),
        leverage: Number(leverage)
    });
}

export async function enableMT5Account(login: number) {
    return await callBridge('/enable-account', { login: Number(login) });
}

export async function stopOutMT5Account(login: number) {
    return await callBridge('/stop-out-account', { login: Number(login) });
}
