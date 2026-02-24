import { fetchMT5Trades } from '../lib/mt5-bridge';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testBridge() {
    const login = 900909493018;
    console.log(`🔌 Testing bridge for login ${login}...`);

    // I need to bypass the .trades extraction to see the whole response
    // I'll use the environment variables directly if needed, or just import and modify locally for test
    const response = await fetch(`${process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co'}/fetch-trades`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.MT5_API_KEY || ''
        },
        body: JSON.stringify({ login })
    });

    const data = await response.json();
    console.log('📦 Bridge Response:', JSON.stringify(data, null, 2));
}

testBridge();
