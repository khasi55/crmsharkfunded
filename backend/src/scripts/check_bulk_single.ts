import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = '900909494245';
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY || '';

async function checkBulk() {
    console.log(`Calling check-bulk for account ${loginId}...`);
    try {
        const payload = [{
            login: Number(loginId),
            min_equity_limit: 0,
            disable_account: true,
            close_positions: false
        }];

        const response = await fetch(`${bridgeUrl}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Bridge error:', await response.text());
            return;
        }

        const data = await response.json() as any;
        console.log('--- CHECK-BULK RESPONSE ---');
        console.log(JSON.stringify(data, null, 2));

    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

checkBulk();
