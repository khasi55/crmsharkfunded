const fetch = require('node-fetch');

async function main() {
    const orderId = 'SF17710776229326G07LJRUG';
    const amount = 89;

    console.log(`Simulating BOGO Payment Webhook for: ${orderId}`);

    const payload = {
        transaction_id: `SIMULATED_BOGO_${Date.now()}`,
        orderid: orderId,
        amount: amount,
        transt: 'success', // Epay success status
        message: 'Manual simulation for BOGO check',
        mid: '976697204360081' // Epay MID
    };

    try {
        const response = await fetch('http://localhost:3001/api/webhooks/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EPay-Simulator'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Response Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response Body: ${text}`);

    } catch (error) {
        console.error('Error sending webhook:', error);
    }
}

main();
