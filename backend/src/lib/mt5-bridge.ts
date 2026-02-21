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

const DEFAULT_TIMEOUT_MS = 95000; // 95s (Just under Cloudflare's 100s)

async function callBridge(endpoint: string, body: any, method = 'POST', options: { signal?: AbortSignal, timeout?: number, retries?: number } = {}) {
    const url = `${getBridgeUrl()}${endpoint}`;
    const { signal, timeout = DEFAULT_TIMEOUT_MS, retries = 2 } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': getApiKey(),
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body),
                // Merge signals: either our timeout or the caller's signal should abort
                signal: signal ? (AbortSignal as any).any([controller.signal, signal]) : controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text();

                // Silence 404s
                if (response.status !== 404) {
                    console.error(`❌ [Bridge] HTTP Error ${response.status} (Attempt ${attempt + 1}/${retries + 1}): ${errText}`);
                }

                // Retry on transient 5xx errors (but not 4xx)
                if (response.status >= 500 && attempt < retries) {
                    const backoff = Math.pow(2, attempt) * 1000;
                    await new Promise(r => setTimeout(r, backoff));
                    continue;
                }

                throw new Error(`Bridge error: ${errText}`);
            }

            return await response.json();

        } catch (error: any) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                if (controller.signal.aborted) {
                    lastError = new Error(`Bridge request timed out after ${timeout}ms`);
                } else {
                    lastError = new Error(`Bridge request aborted by caller`);
                }
            } else {
                lastError = error;
            }

            // Retry on connection errors or timeouts
            if (attempt < retries && (error.name === 'AbortError' || error.message.includes('fetch failed'))) {
                const backoff = Math.pow(2, attempt) * 500;
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }

            // If we reached here, either we out of retries or it's a non-retryable error
            if (!lastError.message.includes('404')) {
                console.error(`❌ [Bridge] ${endpoint} failed:`, lastError.message);
            }
            throw lastError;
        }
    }
}

export async function createMT5Account(params: MT5AccountParams, signal?: AbortSignal) {
    return await callBridge('/create-account', params, 'POST', { signal });
}

export async function fetchMT5Trades(login: number, signal?: AbortSignal) {
    try {
        const data = await callBridge('/fetch-trades', { login }, 'POST', { signal }) as any;
        return data?.trades || [];
    } catch (error) {
        return [];
    }
}

export async function fetchMT5History(login: number, fromTimestamp?: number, signal?: AbortSignal) {
    try {
        const from = fromTimestamp || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        const to = Math.floor(Date.now() / 1000);

        // Use fetch-trades instead of history as it returns both open and closed trades
        const data = await callBridge('/fetch-trades', {
            login,
            from,
            to,
            incremental: false
        }, 'POST', { signal }) as any;

        return data?.trades || [];
    } catch (error) {
        return [];
    }
}

export async function disableMT5Account(login: number, signal?: AbortSignal) {
    try {
        await callBridge('/disable-account', { login: Number(login) }, 'POST', { signal });
        return { success: true };
    } catch (error: any) {
        if (error.message.includes('404')) return { success: true, warning: 'Account not found' };
        throw error;
    }
}

export async function adjustMT5Balance(login: number, amount: number, comment: string = 'Admin Adjustment', signal?: AbortSignal) {
    return await callBridge('/adjust-balance', {
        login: Number(login),
        amount: Number(amount),
        comment
    }, 'POST', { signal });
}

export async function changeMT5Leverage(login: number, leverage: number, signal?: AbortSignal) {
    return await callBridge('/change-leverage', {
        login: Number(login),
        leverage: Number(leverage)
    }, 'POST', { signal });
}

export async function enableMT5Account(login: number, signal?: AbortSignal) {
    return await callBridge('/enable-account', { login: Number(login) }, 'POST', { signal });
}

export async function stopOutMT5Account(login: number, signal?: AbortSignal) {
    return await callBridge('/stop-out-account', { login: Number(login) }, 'POST', { signal });
}
