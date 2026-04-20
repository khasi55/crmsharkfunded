import fetch from 'node-fetch';

// Using the production API URL from the environment
const PRODUCTION_URL = 'https://api.sharkfunded.co';

async function testLiveExploit() {
    console.log(`--- Testing Price Mismatch Protection (LIVE: ${PRODUCTION_URL}) ---`);

    // Attempting to buy a 100K Lite Two-Step (Standard Price $440) for $1
    const payload = {
        gateway: 'sharkpay',
        orderId: `LIVE-TEST-EXPL-${Date.now()}`,
        amount: 1, // MALICIOUS AMOUNT
        currency: 'USD',
        customerEmail: 'live-test-security@example.com',
        customerName: 'Security Tester',
        metadata: {
            account_type: '2-step-lite',
            size: 100000,
            platform: 'MT5'
        }
    };

    try {
        const response = await fetch(`${PRODUCTION_URL}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json() as any;
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));

        if (response.status === 400 && data.error && data.error.includes('Price mismatch')) {
            console.log('\n✅ PASS: Attack BLOCKED by live server-side validation.');
            console.log(`Message: ${data.error}`);
        } else if (response.status === 200) {
            console.error('\n❌ FAIL: Attack SUCCEEDED on live backend! Fix is not yet deployed or is failing.');
        } else {
            console.warn(`\n❓ Unexpected status ${response.status}: ${data.error || 'Unknown error'}`);
        }
    } catch (error: any) {
        console.error('❌ Error connecting to live backend:', error.message);
    }
}

testLiveExploit();
