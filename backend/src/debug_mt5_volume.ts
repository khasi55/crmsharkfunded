
import dotenv from 'dotenv';
dotenv.config();

const login = 889228800; // Login from ticket 6520622
const mt5ApiUrl = process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.sharkfunded.co';
const apiKey = 'sk_live_mt5_bridge_2026_secure_key_v1_xK9mP4nQ7wL2sR8tY3vB6cJ1hF5gD0zA';

async function run() {
    console.log(`Fetching trades for ${login} from ${mt5ApiUrl}...`);
    try {
        const response = await fetch(`${mt5ApiUrl}/fetch-trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ login })
        });

        if (!response.ok) {
            console.error(`Failed: ${response.status} ${response.statusText}`);
            console.log(await response.text());
            return;
        }

        const data = await response.json() as any;
        const trades = data.trades || [];
        console.log(`Found ${trades.length} trades.`);

        // Print relevant fields including Raw Volume
        trades.filter((t: any) => [6520655, 6520622, 6520621].includes(t.ticket)).forEach((t: any) => {
            console.log(`Ticket: ${t.ticket}, RAW VOLUME: ${t.volume}, Symbol: ${t.symbol}, PL: ${t.profit}`);
        });

        if (trades.length > 0) {
            console.log('Sample Trade Volume:', trades[0].volume);
        }

    } catch (e) {
        console.error(e);
    }
}

run();
