import fetch from 'node-fetch';

async function test() {
    const payload = {
        gateway: 'sharkpay',
        orderId: `SF${Date.now()}`,
        amount: 0.30000000000001137,
        currency: 'USD',
        customerEmail: 'priyansu.paul012@gmail.com',
        customerName: 'Priyansu Paul',
        metadata: {
            "coupon": "SHARK30",
            "platform": "mt5",
            "mt5_group": "demo\\S\\1-SF",
            "account_size": 25000,
            "account_type": "1-step-lite"
        }
    };

    const res = await fetch('http://localhost:3002/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("STATUS:", res.status);
    console.log("BODY:", data);
}
test();
