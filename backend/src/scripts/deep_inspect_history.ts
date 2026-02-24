import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = '900909494245';
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY || '';

async function inspectHistory() {
    console.log(`Deep inspection for account ${loginId}...`);
    try {
        // Try to fetch from beginning of time (or reasonably long ago)
        const from = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60); // 60 days

        const response = await fetch(`${bridgeUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                login: Number(loginId),
                from: from
            })
        });

        if (!response.ok) {
            console.error('Bridge error:', await response.text());
            return;
        }

        const data = await response.json() as any;
        console.log('--- RAW BRIDGE RESPONSE ---');
        console.log(JSON.stringify(data, null, 2));

        if (data.trades) {
            console.log('\n--- TRADE ANALYSIS ---');
            data.trades.forEach((t: any) => {
                const profit = Number(t.profit);
                const comm = Number(t.commission || 0);
                const swap = Number(t.swap || 0);
                const net = profit + comm + swap;
                console.log(`Ticket: ${t.ticket}, Symbol: ${t.symbol}, Net: ${net} (P: ${profit}, C: ${comm}, S: ${swap}), Time: ${t.time || t.open_time}`);
            });
        }
    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

inspectHistory();
