
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function checkBridgeRaw() {
    const login = 900909492845;
    const url = `https://bridge.sharkfunded.co/fetch-trades`;
    const apiKey = process.env.MT5_API_KEY;

    console.log(`Fetching raw data for ${login}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey || '',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ login, from: 0 })
        });

        const data = await response.json();
        console.log('Bridge Meta Data:', {
            login: data.login,
            balance: data.balance,
            equity: data.equity,
            margin: data.margin,
            free_margin: data.free_margin
        });

        if (data.trades) {
            console.log(`Found ${data.trades.length} trades.`);
            if (data.trades.length > 0) {
                console.log('Sample trade:', JSON.stringify(data.trades[0], null, 2));
            }
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

checkBridgeRaw();
