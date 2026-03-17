import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testPriceMismatch() {
    console.log('--- Testing Price Mismatch Protection ---');

    // Attempting to buy a 100K Lite Two-Step (Standard Price $440) for $1
    const payload = {
        gateway: 'sharkpay',
        orderId: `TEST-MISMATCH-${Date.now()}`,
        amount: 1, // MALICIOUS AMOUNT
        currency: 'USD',
        customerEmail: 'test-attacker@example.com',
        customerName: 'Attacker',
        metadata: {
            account_type: '2-step-lite',
            size: 100000,
            platform: 'MT5'
        }
    };

    try {
        const response = await fetch(`${BASE_URL}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json() as any;
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));

        if (response.status === 400 && data.error && data.error.includes('Price mismatch')) {
            console.log('✅ PASS: Attack blocked by server-side validation.');
        } else if (response.status === 200) {
            console.error('❌ FAIL: Attack succeeded! Validation is still broken.');
        } else {
            console.warn(`❓ Unexpected status ${response.status}: ${data.error || 'Unknown error'}`);
        }
    } catch (error: any) {
        console.error('❌ Error connecting to backend:', error.message);
    }
}

async function testValidPrice() {
    console.log('\n--- Testing Valid Price Flow ---');

    // Buying a 5K Lite Two-Step (Standard Price $30)
    const payload = {
        gateway: 'sharkpay',
        orderId: `TEST-VALID-${Date.now()}`,
        amount: 30, // CORRECT AMOUNT
        currency: 'USD',
        customerEmail: 'test-user@example.com',
        customerName: 'Legit User',
        metadata: {
            account_type: '2-step-lite',
            size: 5000,
            platform: 'MT5'
        }
    };

    try {
        const response = await fetch(`${BASE_URL}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json() as any;
        console.log(`Status: ${response.status}`);

        if (response.status === 200 && data.success) {
            console.log('✅ PASS: Legitimate order created successfully.');
        } else {
            console.error('❌ FAIL: Legitimate order blocked or failed:', data.error);
        }
    } catch (error: any) {
        console.error('❌ Error connecting to backend:', error.message);
    }
}

async function run() {
    await testPriceMismatch();
    await testValidPrice();
}

run();
