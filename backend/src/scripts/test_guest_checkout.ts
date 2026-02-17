
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const RANDOM_EMAIL = `test-guest-${Math.random().toString(36).substring(7)}@example.com`;
const ORDER_ID = `SF-GUEST-${Date.now()}`;

async function testGuestCheckout() {
    console.log(`\nTesting Guest Checkout for email: ${RANDOM_EMAIL}`);
    const url = `${BASE_URL}/api/webhooks/cregis`;

    // Simulate Cregis Payload for a NEW order
    const payload = {
        pid: 1430965607415808,
        data: JSON.stringify({
            cregis_id: `po${Date.now()}`,
            order_id: ORDER_ID,
            receive_amount: "1",
            receive_currency: "USDT",
            pay_amount: "1",
            pay_currency: "USDT",
            order_amount: "1",
            order_currency: "USD",
            status: "paid",
            payer_id: RANDOM_EMAIL,
            payer_name: "Guest Trader",
            payer_email: RANDOM_EMAIL,
            remark: `Order ${ORDER_ID}`
        }),
        sign: "dummy_sign",
        nonce: "LxtU4m",
        timestamp: Date.now(),
        event_name: "order",
        event_type: "paid"
    };

    try {
        console.log('Sending payload...');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (text.includes('success":true') || text.includes('Process completed')) {
            console.log('\n✅ Verification Successful: Guest checkout handled successfully!');
        } else {
            console.log('\n❌ Verification Failed: Guest checkout did not return success.');
            console.log('Check server logs for "Profile creation failed" or "Challenge Creation Failed"');
        }

    } catch (error) {
        console.error(`Error reaching server:`, error);
    }
}

testGuestCheckout();
