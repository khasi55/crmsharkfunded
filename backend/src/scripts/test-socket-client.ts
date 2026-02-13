
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BACKEND_URL = 'http://localhost:3002'; // Adjust if needed
const TEST_USER_ID = '063e16f4-4fea-4423-817d-eff4f384cd69'; // Use a known user ID or dummy
// We need a valid CHALLENGE ID to subscribe to. 
// I'll use a placeholder, but ideally we query one. 
// For now, let's assume one exists or we just test the subscription event.
const TEST_CHALLENGE_ID = '063e16f4-4fea-4423-817d-eff4f384cd69'; // Placeholder, replace if known

console.log(`🔌 Connecting to ${BACKEND_URL}...`);

const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false
});

socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO');

    // 1. Authenticate
    console.log(`🔐 Authenticating as ${TEST_USER_ID}...`);
    socket.emit('authenticate', { userId: TEST_USER_ID });
});

socket.on('authenticated', (data) => {
    console.log('✅ Authenticated!', data);

    // 2. Subscribe to Challenge
    console.log(`📡 Subscribing to challenge ${TEST_CHALLENGE_ID}...`);
    socket.emit('subscribe_challenge', TEST_CHALLENGE_ID);
});

socket.on('balance_update', (data) => {
    console.log('🔥 RECEIVED BALANCE UPDATE:', data);
});

socket.on('trade_update', (data) => {
    console.log('🔥 RECEIVED TRADE UPDATE:', data);
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection Error:', err.message);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

// Keep alive
setInterval(() => { }, 1000);
