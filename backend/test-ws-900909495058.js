const WebSocket = require('ws');
const login = '900909495058';
const url = `wss://bridge.sharkfunded.co/ws/stream/${login}`;

console.log(`Starting WS test for account ${login}...`);

const ws = new WebSocket(url, {
    headers: {
        'X-API-Key': 'sk_live_mt5_bridge_2026_secure_key_v1_xK9mP4nQ7wL2sR8tY3vB6cJ1hF5gD0zA',
        'ngrok-skip-browser-warning': 'true'
    }
});

let messageCount = 0;

ws.on('open', () => {
    console.log(`✅ Connected to MT5 Bridge WebSocket for login ${login}.`);
    console.log('Listening for messages for 15 seconds...');
});

ws.on('message', (data) => {
    messageCount++;
    const parsed = JSON.parse(data);
    console.log(`\n📥 Received message #${messageCount}:`, parsed);

    // Check if it's an error message
    if (parsed.error) {
        console.error(`❌ ERROR IN MESSAGE: ${parsed.error}`);
    }
});

ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err);
});

ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed. Code: ${code}, Reason: ${reason}`);
});

setTimeout(() => {
    console.log(`\n⏱️ Timeout reached. Closing connection. Expected 15 seconds.`);
    console.log(`Total messages received: ${messageCount}`);

    // We can also exit with error code if we didn't receive any message
    if (messageCount === 0) {
        console.log("No messages received! The bridge might not be pushing updates for this account or it's completely silent.");
    }

    ws.close();
    process.exit(0);
}, 15000);
