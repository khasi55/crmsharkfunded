
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const ORDER_ID = 'SF1771225810533C5SQ8PA2Q';

async function testWebhook() {
    console.log(`\nTesting Cregis Paid Over Status on /api/webhooks/cregis`);
    const url = `${BASE_URL}/api/webhooks/cregis`;

    // Simulate Cregis 'paid_over' Payload
    const payload = {
        pid: 1430965607415808,
        data: JSON.stringify({
            cregis_id: "po1450988185313280",
            order_id: ORDER_ID,
            receive_amount: "34.30",
            receive_currency: "USDT",
            pay_amount: "35",
            pay_currency: "USDT",
            order_amount: "34.3",
            order_currency: "USD",
            exchange_rate: "1",
            payment_address: "0xd5b11a5881c1bee087a279f7d7c6415f0a2fec49",
            created_time: 1771225812159,
            transact_time: 1771225903403,
            valid_time: 60,
            status: "paid_over", // This is the key field
            payer_id: "dhairyagarg357@gmail.com",
            payer_name: "Shorya",
            payer_email: "dhairyagarg357@gmail.com",
            remark: `Order ${ORDER_ID}`,
            tx_id: "0x5c2dd32683af4498955ae3812cda7933ca8e59b3d70f43dc76144458e6e73cb1"
        }),
        sign: "873f218f2ead46e5efcc8cec958aa8f6",
        nonce: "LxtU4m",
        timestamp: 1771225903433,
        event_name: "order",
        event_type: "paid_over" // Also often sent as event_type
    };

    try {
        console.log('Sending payload:', JSON.stringify(payload, null, 2));

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
            console.log('\n✅ Verification Successful: Webhook handled successfully!');
        } else {
            console.log('\n❌ Verification Failed: Webhook did not return success.');
        }

    } catch (error) {
        console.error(`Error hitting ${url}:`, error);
    }
}

testWebhook();
