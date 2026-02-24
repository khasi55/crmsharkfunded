import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = '900909494245';
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY || '';

async function fetchFullHistory() {
    console.log(`Fetching full history for account ${loginId}...`);
    try {
        const response = await fetch(`${bridgeUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                login: Number(loginId),
                from: 100 // Almost epoch 0
            })
        });

        if (!response.ok) {
            console.error('Bridge error:', await response.text());
            return;
        }

        const data = await response.json() as any;
        console.log(`Found ${data.trades?.length} trades in total.`);
        if (data.trades) {
            data.trades.forEach((t: any) => {
                console.log(`Ticket: ${t.ticket}, Symbol: ${t.symbol}, Type: ${t.type}, Profit: ${t.profit}, Comm: ${t.commission}, Entry: ${t.entry}, Time: ${t.time}`);
            });
        }
    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

fetchFullHistory();
