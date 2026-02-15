
// @ts-nocheck
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.CREGIS_API_KEY;
const PROJECT_ID = process.env.CREGIS_PROJECT_ID;
const API_URL = process.env.CREGIS_API_URL || 'https://t-isqvnaov.cregis.io';

if (!API_KEY || !PROJECT_ID) {
    console.error('Missing Cregis Credentials in .env');
    console.log('Key:', API_KEY);
    console.log('PID:', PROJECT_ID);
    process.exit(1);
}

const CREGIS_ID = 'po145093627632844';

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
    console.log(`Querying Cregis for Cregis ID: ${CREGIS_ID}`);

    const payload: any = {
        pid: PROJECT_ID,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2, 8),
        cregis_id: CREGIS_ID
    };

    payload.sign = generateSignature(payload, API_KEY);

    // The user suggested payment-engine-query, which likely maps to /api/v2/order/info based on previous 200 OK
    // or /api/v2/payment/order/info 
    // We will try likely candidates including the one that gave 200 before.

    // Based on "Request Example" typically matching /api/v2/order/query or /api/v2/payment/query...
    // But previous run showed /api/v2/order/info gave 200.

    const endpoints = [
        '/api/v2/order/info',
        '/api/v2/payment/order/info',
        '/api/v2/order/query',
        '/api/v2/payment/query'
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
            console.log(`    Response: ${response.status}`);
            console.log(`    Body: ${text}`);

            try {
                const data = JSON.parse(text);
                if (data.code === '00000') {
                    console.log('    ✅ Success! Order Status:', JSON.stringify(data.data, null, 2));
                    return;
                }
            } catch (e) { }

        } catch (error) {
            console.error(`    Error hitting ${url}:`, error);
        }
    }
}

queryOrder();
