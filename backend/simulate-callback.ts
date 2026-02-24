import fetch from 'node-fetch';

async function simulateCregisCallback() {
    const url = 'http://127.0.0.1:3001/api/webhooks/cregis';
    const payload = {
        order_id: "SF17717469945909V0XUG8P6",
        status: 1, // 1 = success
        amount: "24.5",
        cregis_id: "cregis_simulated_id_01",
        payment_id: "cregis_simulated_id_01",
        gateway: "cregis"
    };

    console.log(`Sending simulated Cregis callback to ${url}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);
    } catch (err) {
        console.error("Error sending callback:", err);
    }
}

simulateCregisCallback().then(() => {
    console.log("Done.");
    process.exit(0);
});
