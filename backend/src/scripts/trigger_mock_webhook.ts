import fetch from 'node-fetch';

const ORDER_ID = 'SF1771007932725PS9S5K2OW';
const WEBHOOK_URL = 'http://localhost:3001/api/webhooks/payment';

async function triggerWebhook() {
    console.log(`🚀 Triggering webhook for order ${ORDER_ID}...`);

    const body = {
        transactionid: 'MOCK_' + Date.now(),
        orderid: ORDER_ID,
        status: 'verified',
        amount: 30, // Price in USD
        mid: 'sharkpay_mid'
    };

    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

triggerWebhook();
