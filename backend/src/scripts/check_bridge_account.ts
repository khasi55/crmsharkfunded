import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = '900909494245';
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY || '';

async function checkBridge() {
    console.log(`Checking bridge for account ${loginId}...`);
    try {
        const response = await fetch(`${bridgeUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ login: Number(loginId) })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Bridge error:', text);
            return;
        }

        const data = await response.json() as any;
        console.log('Bridge Data Summary:');
        console.log(`Account ID: ${data.login}`);
        console.log(`Reported Trades Count: ${data.trades?.length}`);

        // Fetch specific account info if endpoint exists
        // Looking at lib/mt5-bridge.ts, there isn't a direct "get account info" but we can infer from trades or try to find other endpoints

        if (data.trades && data.trades.length > 0) {
            let sum = 0;
            data.trades.forEach((t: any) => {
                sum += Number(t.profit);
                // Also check if there's any other field like balance in the response
            });
            console.log(`Sum of Profits from Bridge: ${sum}`);
        }

    } catch (e: any) {
        console.error('Failed to connect to bridge:', e.message);
    }
}

checkBridge();
