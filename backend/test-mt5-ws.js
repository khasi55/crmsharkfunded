const WebSocket = require('ws');
const url = 'wss://bridge.sharkfunded.co/ws/stream/0';

const ws = new WebSocket(url, {
    headers: {
        'X-API-Key': 'sk_live_mt5_bridge_2026_secure_key_v1_xK9mP4nQ7wL2sR8tY3vB6cJ1hF5gD0zA',
        'ngrok-skip-browser-warning': 'true'
    }
});

ws.on('open', () => {
    console.log('Connected to MT5 Bridge WebSocket.');
});

ws.on('message', (data) => {
    console.log('Received message:', JSON.parse(data));
});

ws.on('error', (err) => {
    console.error('Error:', err);
});

ws.on('close', () => {
    console.log('Connection closed.');
});

setTimeout(() => {
    console.log('Timeout reached. Closing connection.');
    ws.close();
}, 10000); // Wait 10 seconds to see if any updates come through
