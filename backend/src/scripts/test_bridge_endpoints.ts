import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const loginId = '900909494245';
const bridgeUrl = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const apiKey = process.env.MT5_API_KEY || '';

async function testEndpoints() {
    const endpoints = ['/fetch-history', '/fetch-deals', '/get-history'];

    for (const endpoint of endpoints) {
        console.log(`\nTesting endpoint: ${endpoint}`);
        try {
            const response = await fetch(`${bridgeUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ login: Number(loginId) })
            });

            if (response.status === 404) {
                console.log(`Result: 404 Not Found`);
                continue;
            }

            if (!response.ok) {
                console.log(`Result: Error ${response.status} - ${await response.text()}`);
                continue;
            }

            const data = await response.json();
            console.log(`Result: Success!`);
            console.log(JSON.stringify(data, null, 2));
        } catch (e: any) {
            console.error(`Failed ${endpoint}:`, e.message);
        }
    }
}

testEndpoints();
