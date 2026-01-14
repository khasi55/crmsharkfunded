import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { supabase } from '../lib/supabase';

let io: SocketIOServer | null = null;
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';


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
        if (DEBUG) console.log(`🔌 WebSocket connected: ${socket.id}`);

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

                console.log(`🔐 Socket authenticated for user: ${userId}`); // Auth is important, but maybe debug only? Let's keep it visible for now or debug?
                // User asked to wrap high volume logs. Auth is 1 per session. 
                // Let's wrap it to be consistent with "logs in terminal" request.
                if (DEBUG) console.log(`🔐 Socket authenticated for user: ${userId}`);
            } catch (error) {
                console.error('Authentication error:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });

        // Handle manual challenge subscription
        socket.on('subscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.join(roomName);
            if (DEBUG) console.log(`📡 Socket ${socket.id} subscribed to ${roomName}`);
        });

        // Handle unsubscribe
        socket.on('unsubscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.leave(roomName);
            if (DEBUG) console.log(`📴 Socket ${socket.id} unsubscribed from ${roomName}`);
        });

        socket.on('disconnect', () => {
            // if (DEBUG) console.log(`🔌 WebSocket disconnected: ${socket.id}`);
        });

        socket.on('error', (error) => {
            console.error(`❌ WebSocket error on ${socket.id}:`, error);
        });
    });

    console.log('✅ Socket.IO initialized');
    return io;
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
        roomCount: rooms.length
    };
}

// Broadcast helpers
export function broadcastTradeUpdate(challengeId: string, trade: any) {
    if (!io) {
        console.warn('⚠️ Socket.IO not initialized, cannot broadcast trade update');
        return;
    }

    const roomName = `challenge_${challengeId}`;
    io.to(roomName).emit('trade_update', trade);
    if (DEBUG) console.log(`📤 Broadcasted trade update to room: ${roomName}`);
}

export function broadcastBalanceUpdate(challengeId: string, balanceData: any) {
    if (!io) {
        console.warn('⚠️ Socket.IO not initialized, cannot broadcast balance update');
        return;
    }

    const roomName = `challenge_${challengeId}`;
    io.to(roomName).emit('balance_update', balanceData);
    if (DEBUG) console.log(`📤 Broadcasted balance update to room: ${roomName}`);
}

export function broadcastToUser(userId: string, event: string, data: any) {
    if (!io) {
        console.warn('⚠️ Socket.IO not initialized, cannot broadcast to user');
        return;
    }

    io.to(`user_${userId}`).emit(event, data);
    if (DEBUG) console.log(`📤 Broadcasted ${event} to user: ${userId}`);
}
