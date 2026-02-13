import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import WebSocket from 'ws';
import { supabase } from '../lib/supabase';

let io: SocketIOServer | null = null;
const DEBUG = process.env.DEBUG === 'true'; // STRICT: Silence socket logs in dev


export function initializeSocket(httpServer: HTTPServer) {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3002',
                    'https://app.sharkfunded.com', // Explicit Add
                    'https://admin.sharkfunded.com', // Explicit Add
                    'https://api.sharkfunded.co', // Explicit Add
                    process.env.FRONTEND_URL,
                    process.env.ADMIN_URL
                ].filter(Boolean) as string[];

                if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.ngrok-free.app')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', async (socket) => {
        if (DEBUG) console.log(`WebSocket connected: ${socket.id}`);

        // Handle authentication - expect userId from client
        socket.on('authenticate', async (data: { userId: string }) => {
            try {
                const { userId } = data;

                if (!userId) {
                    socket.emit('auth_error', { message: 'Missing userId' });
                    return;
                }

                // Store userId in socket
                (socket as any).userId = userId;

                // Join user-specific room
                socket.join(`user_${userId}`);

                socket.emit('authenticated', {
                    success: true,
                    challenges: [] // No longer auto-subscribing
                });

                if (DEBUG) console.log(` Socket authenticated for user: ${userId}`);
            } catch (error) {
                console.error('Authentication error:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });

        // Handle manual challenge subscription
        socket.on('subscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.join(roomName);
            if (DEBUG) console.log(` Socket ${socket.id} subscribed to ${roomName}`);
        });

        // Handle unsubscribe
        socket.on('unsubscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.leave(roomName);
            if (DEBUG) console.log(` Socket ${socket.id} unsubscribed from ${roomName}`);
        });

        // Handle Competition Room Join
        socket.on('subscribe_competition', (competitionId: string) => {
            const roomName = `competition_${competitionId}`;
            socket.join(roomName);
            if (DEBUG) console.log(` Socket ${socket.id} joined competition room: ${roomName}`);
        });

        socket.on('unsubscribe_competition', (competitionId: string) => {
            const roomName = `competition_${competitionId}`;
            socket.leave(roomName);
            if (DEBUG) console.log(` Socket ${socket.id} left competition room: ${roomName}`);
        });

        socket.on('disconnect', () => {
            // if (DEBUG) console.log(` WebSocket disconnected: ${socket.id}`);
        });

        socket.on('error', (error) => {
            console.error(` WebSocket error on ${socket.id}:`, error);
        });
    });

    return io;
}

// --- MT5 BRIDGE WEBSOCKET RELAY ---
const BRIDGE_WS_URL = process.env.MT5_BRIDGE_WS_URL || 'wss://bridge.sharkfunded.co/ws/stream/0';
let bridgeWs: WebSocket | null = null;
const loginToChallengeMap = new Map<number, string>();
let bridgeStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
let lastBridgeError: string | null = null;

async function getChallengeIdByLogin(login: number): Promise<string | null> {
    // 1. Check cache
    if (loginToChallengeMap.has(login)) {
        return loginToChallengeMap.get(login)!;
    }

    // 2. Query Supabase
    try {
        const { data, error } = await supabase
            .from('challenges')
            .select('id')
            .eq('login', login)
            .single();

        if (data && !error) {
            loginToChallengeMap.set(login, data.id);
            return data.id;
        }
    } catch (err) {
        console.error(`❌ WS Relay: DB Lookup failed for login ${login}:`, err);
    }
    return null;
}

export function initializeBridgeWS() {
    console.log(`🔌 WS Relay: Connecting to MT5 Bridge at ${BRIDGE_WS_URL}...`);

    bridgeWs = new WebSocket(BRIDGE_WS_URL, {
        headers: {
            'X-API-Key': process.env.MT5_API_KEY || '',
            'ngrok-skip-browser-warning': 'true'
        }
    });

    bridgeWs.on('open', () => {
        console.log('✅ WS Relay: Connected to MT5 Bridge');
        bridgeStatus = 'connected';
        lastBridgeError = null;
    });

    bridgeWs.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            const { event, login } = message;

            if (DEBUG) console.log(`📥 WS Relay: Received ${event} for login ${login}`);

            const challengeId = await getChallengeIdByLogin(login);
            if (!challengeId) {
                if (DEBUG) console.warn(`⚠️ WS Relay: No challenge found for login ${login}`);
                return;
            }

            if (event === 'account_update') {
                // Relay Balance/Equity/P&L
                broadcastBalanceUpdate(challengeId, {
                    equity: message.equity,
                    floating_pl: message.floating_pl,
                    timestamp: message.timestamp
                });

                // If trades were closed in this update, relay them too
                if (message.trades_closed && Array.isArray(message.trades)) {
                    message.trades.forEach((trade: any) => {
                        broadcastTradeUpdate(challengeId, {
                            type: 'new_trade',
                            trade: trade
                        });
                    });
                }
            } else if (event === 'trade_update' || event === 'trades_closed') {
                // Relay each trade in the batch if it's a batch, or handle individual
                if (Array.isArray(message.trades)) {
                    message.trades.forEach((trade: any) => {
                        broadcastTradeUpdate(challengeId, {
                            type: 'new_trade',
                            trade: trade
                        });
                    });
                } else if (message.trade) {
                    broadcastTradeUpdate(challengeId, {
                        type: 'new_trade',
                        trade: message.trade
                    });
                }
            }
        } catch (err) {
            console.error('❌ WS Relay: Message processing failed:', err);
        }
    });

    bridgeWs.on('close', () => {
        console.warn('⚠️ WS Relay: Bridge connection closed. Reconnecting in 5s...');
        bridgeStatus = 'disconnected';
        setTimeout(initializeBridgeWS, 5000);
    });

    bridgeWs.on('error', (err) => {
        console.error('❌ WS Relay: Bridge error:', err.message);
        bridgeStatus = 'error';
        lastBridgeError = err.message;
    });
}

export function getIO(): SocketIOServer | null {
    return io;
}

// Metrics
export function getSocketMetrics() {
    if (!io) {
        return {
            totalConnections: 0,
            authenticatedConnections: 0,
            rooms: []
        };
    }

    const sockets = Array.from(io.sockets.sockets.values());
    const authenticatedCount = sockets.filter(s => (s as any).userId).length;
    const rooms = Array.from(io.sockets.adapter.rooms.keys())
        .filter(room => room.startsWith('challenge_') || room.startsWith('user_'));

    return {
        totalConnections: io.engine.clientsCount,
        authenticatedConnections: authenticatedCount,
        rooms: rooms,
        roomCount: rooms.length,
        bridge: {
            status: bridgeStatus,
            error: lastBridgeError
        }
    };
}

// Broadcast helpers
export function broadcastTradeUpdate(challengeId: string, trade: any) {
    if (!io) {
        if (DEBUG) console.warn(' Socket.IO not initialized, cannot broadcast trade update');
        return;
    }

    const roomName = `challenge_${challengeId}`;
    io.to(roomName).emit('trade_update', trade);
    if (DEBUG) console.log(` Broadcasted trade update to room: ${roomName}`);
}

export function broadcastBalanceUpdate(challengeId: string, balanceData: any) {
    if (!io) {
        if (DEBUG) console.warn(' Socket.IO not initialized, cannot broadcast balance update');
        return;
    }

    const roomName = `challenge_${challengeId}`;
    io.to(roomName).emit('balance_update', balanceData);
    if (DEBUG) console.log(` Broadcasted balance update to room: ${roomName}`);
}

export function broadcastToUser(userId: string, event: string, data: any) {
    if (!io) {
        if (DEBUG) console.warn(' Socket.IO not initialized, cannot broadcast to user');
        return;
    }

    io.to(`user_${userId}`).emit(event, data);
    if (DEBUG) console.log(` Broadcasted ${event} to user: ${userId}`);
}

export function broadcastLeaderboard(competitionId: string, leaderboard: any[]) {
    if (!io) {
        if (DEBUG) console.warn(' Socket.IO not initialized, cannot broadcast leaderboard');
        return;
    }

    // Broadcast to a specific competition room (e.g., 'competition_123')
    // Clients viewing that competition will join this room.
    const roomName = `competition_${competitionId}`;
    io.to(roomName).emit('leaderboard_update', leaderboard);
    if (DEBUG) console.log(` Broadcasted leaderboard update for ${competitionId} (Rows: ${leaderboard.length})`);
}
