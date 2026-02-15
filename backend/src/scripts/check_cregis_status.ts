// @ts-nocheck
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.CREGIS_API_KEY;
const PROJECT_ID = process.env.CREGIS_PROJECT_ID;
const API_URL = process.env.CREGIS_API_URL || 'https://t-isqvnaov.cregis.io';

if (!API_KEY || !PROJECT_ID) {
    console.error('Missing Cregis Credentials in .env');
    process.exit(1);
}

const ORDER_ID = 'SF1771162477911OTLBQOTYO';

function generateSignature(payload: any, apiKey: string): string {
    const keys = Object.keys(payload).filter(k =>
        k !== 'sign' && payload[k] !== null && payload[k] !== undefined && payload[k] !== ''
    ).sort();

    let paramString = '';
    for (const key of keys) {
        paramString += `${key}${payload[key]}`;
    }

    const signString = apiKey + paramString;
    return crypto.createHash('md5').update(signString).digest('hex').toLowerCase();
}

async function queryOrder() {
    console.log(`Querying Cregis for Order: ${ORDER_ID}`);

    const project_id = PROJECT_ID || '';
    const api_key = API_KEY || '';

    const payload: any = {
        pid: project_id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2, 8),
        order_id: ORDER_ID
    };

    payload.sign = generateSignature(payload, api_key);

    // Try likely endpoints
    const endpoints = [
        '/api/v2/payment/query',
        '/api/v2/order/info',
        '/api/v2/payment/order/query'
    ];

    for (const ep of endpoints) {
        const url = `${API_URL}${ep}`;
        console.log(`\nTrying URL: ${url}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': API_KEY
                },
                body: JSON.stringify(payload)
            });

            const text = await response.text();
            console.log(`Response Check: ${response.status}`);
            console.log(text);

            try {
                const data = JSON.parse(text);
                if (data.code === '00000') {
                    console.log('✅ Success! Order Status:', data.data);
                    return;
                }
            } catch (e) { }

        } catch (error) {
            console.error(`Error hitting ${url}:`, error);
        }
    }
}

queryOrder();
