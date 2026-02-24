import WebSocket from 'ws';

const ws = new WebSocket('wss://bridge.sharkfunded.co/ws/stream/0');
console.log('Connecting to bridge master stream...');

ws.on('open', () => {
    console.log('Connected! Waiting 15 seconds for any updates from the MT5 bridge...');
    setTimeout(() => {
        console.log('Closing listener.');
        ws.close();
        process.exit(0);
    }, 15000);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.log('Received Event:', msg.event, 'for Login:', msg.login);
    } catch {
        console.log('Raw message:', data.toString());
    }
});
