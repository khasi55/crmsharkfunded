
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const ORDER_ID = 'SF1771162477911OTLBQOTYO';

async function testWebhook(endpoint: string) {
    console.log(`\nTesting Endpoint: ${endpoint}`);
    const url = `${BASE_URL}${endpoint}`;

    // Simulate Cregis Payload
    const payload = {
        order_id: ORDER_ID,
        third_party_id: ORDER_ID,
        status: 1, // Success
        amount: 440,
        currency: 'USD',
        payment_status: 'paid',
        transaction_id: `TXN-${Date.now()}`
    };

    try {
        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // We test standard JSON first
                // 'Content-Type': 'text/plain' // We could test this too if needed
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

    } catch (error) {
        console.error(`Error hitting ${url}:`, error);
    }
}

async function main() {
    // Test the generic payment endpoint (where the error was seen)
    await testWebhook('/api/webhooks/payment');

    // Test the dedicated cregis endpoint
    await testWebhook('/api/webhooks/cregis');
}

main();
