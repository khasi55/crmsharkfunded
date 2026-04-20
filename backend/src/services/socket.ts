import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import WebSocket from 'ws';
import { supabase } from '../lib/supabase';
import { RulesService } from './rules-service';
import { performance } from 'perf_hooks';

let io: SocketIOServer | null = null;
const DEBUG = process.env.DEBUG === 'true'; // STRICT: Silence socket logs in dev
const LATENCY_DEBUG = process.env.WS_LATENCY_DEBUG === 'true'; 


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
                if (DEBUG) console.log(`🔐 Socket authenticating for user: ${userId}`);

                if (!userId) {
                    socket.emit('auth_error', { message: 'Missing userId' });
                    return;
                }

                (socket as any).userId = userId;
                socket.join(`user_${userId}`);

                socket.emit('authenticated', {
                    success: true,
                    challenges: []
                });

                if (DEBUG) console.log(`✅ Socket authenticated for user: ${userId}`);
            } catch (error) {
                console.error('Authentication error:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });

        socket.on('subscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.join(roomName);
            if (DEBUG) console.log(`🔔 Socket ${socket.id} joined ${roomName}`);
        });

        socket.on('unsubscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.leave(roomName);
            if (DEBUG) console.log(`🔕 Socket ${socket.id} left ${roomName}`);
        });

        // ... competition handlers ...
        socket.on('subscribe_competition', (competitionId: string) => {
            const roomName = `competition_${competitionId}`;
            socket.join(roomName);
        });

        socket.on('unsubscribe_competition', (competitionId: string) => {
            const roomName = `competition_${competitionId}`;
            socket.leave(roomName);
        });

        socket.on('disconnect', () => {
            if (DEBUG) console.log(`🔌 WebSocket disconnected: ${socket.id}`);
        });

        socket.on('error', (error) => {
            console.error(`❌ WebSocket error on ${socket.id}:`, error);
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

interface ChallengeMetadata {
    id: string;
    initialBalance: number;
    startOfDayEquity: number;
    maxDailyLossPercent: number;
    maxTotalLossPercent: number;
    lastFetched: number;
}

const challengeMetadataCache = new Map<number, ChallengeMetadata>();
const CACHE_TTL = 60 * 1000; // 1 minute

async function getChallengeMetadata(login: number): Promise<ChallengeMetadata | null> {
    const cached = challengeMetadataCache.get(login);
    if (cached && (Date.now() - cached.lastFetched < CACHE_TTL)) {
        return cached;
    }

    try {
        const { data: challenge, error } = await supabase
            .from('challenges')
            .select('id, initial_balance, start_of_day_equity, group, challenge_type')
            .eq('login', login)
            .single();

        if (challenge && !error) {
            const rules = await RulesService.getRules(challenge.group, challenge.challenge_type);
            const metadata: ChallengeMetadata = {
                id: challenge.id,
                initialBalance: Number(challenge.initial_balance),
                startOfDayEquity: Number(challenge.start_of_day_equity || challenge.initial_balance),
                maxDailyLossPercent: rules.max_daily_loss_percent,
                maxTotalLossPercent: rules.max_total_loss_percent,
                lastFetched: Date.now()
            };
            challengeMetadataCache.set(login, metadata);
            // Also update the short-term login map
            loginToChallengeMap.set(login, challenge.id);
            return metadata;
        }
    } catch (err) {
        console.error(`❌ WS Relay: Metadata lookup failed for login ${login}:`, err);
    }
    return null;
}

async function getChallengeIdByLogin(login: number): Promise<string | null> {
    if (loginToChallengeMap.has(login)) {
        return loginToChallengeMap.get(login)!;
    }

    try {
        const { data, error } = await supabase
            .from('challenges')
            .select('id')
            .eq('login', login)
            .single();

        if (data && !error) {
            loginToChallengeMap.set(login, data.id);
            // if (DEBUG) console.log(`🔗 Mapped Login ${login} -> Challenge ${data.id}`);
            return data.id;
        }
    } catch (err) {
        console.error(`❌ WS Relay: DB Lookup failed for login ${login}:`, err);
    }
    return null;
}

export function initializeBridgeWS() {
    if (DEBUG) console.log(`🔌 WS Relay: Connecting to MT5 Bridge at ${BRIDGE_WS_URL}...`);

    bridgeWs = new WebSocket(BRIDGE_WS_URL, {
        headers: {
            'X-API-Key': process.env.MT5_API_KEY || '',
            'ngrok-skip-browser-warning': 'true'
        }
    });

    bridgeWs.on('open', () => {
        if (DEBUG) console.log('✅ WS Relay: Connected to MT5 Bridge');
        bridgeStatus = 'connected';
        lastBridgeError = null;
    });

    bridgeWs.on('message', async (data) => {
        try {
            const startProcessing = performance.now();
            const message = JSON.parse(data.toString());
            const { event, login } = message;

            // latency tracking
            const bridgeTimestamp = message.timestamp || Date.now();

            // Uncommented for active debugging of all traffic
            // if (DEBUG) console.log(`📥 WS Relay: Received ${event} for login ${login}`);

            const challengeId = await getChallengeIdByLogin(login);
            if (!challengeId) {
                return;
            }

            if (event === 'account_update') {
                const metadata = await getChallengeMetadata(login);
                if (metadata) {
                    const currentEquity = Number(message.equity);
                    const initialBalance = metadata.initialBalance;
                    const startOfDayEquity = metadata.startOfDayEquity;

                    // Calculate Daily Drawdown
                    const dailyNet = currentEquity - startOfDayEquity;
                    const dailyLoss = dailyNet >= 0 ? 0 : Math.round(Math.abs(dailyNet) * 100) / 100;
                    const maxDailyLossAmount = Math.round(initialBalance * (metadata.maxDailyLossPercent / 100) * 100) / 100;
                    const dailyBreachLevel = Math.round((startOfDayEquity - maxDailyLossAmount) * 100) / 100;
                    const dailyRemaining = Math.max(0, Math.round((currentEquity - dailyBreachLevel) * 100) / 100);

                    // Calculate Total Drawdown
                    const totalNet = currentEquity - initialBalance;
                    const totalLoss = totalNet >= 0 ? 0 : Math.round(Math.abs(totalNet) * 100) / 100;
                    const maxTotalLossAmount = Math.round(initialBalance * (metadata.maxTotalLossPercent / 100) * 100) / 100;
                    const totalBreachLevel = Math.round((initialBalance - maxTotalLossAmount) * 100) / 100;
                    const totalRemaining = Math.max(0, Math.round((currentEquity - totalBreachLevel) * 100) / 100);

                    // if (DEBUG) console.log(`⚡️ Relay Metrics→Frontend for challenge_${metadata.id} (Eq: ${currentEquity}, DailyLoss: ${dailyLoss}, TotalLoss: ${totalLoss})`);
                    
                    broadcastBalanceUpdate(metadata.id, {
                        equity: Math.round(currentEquity * 100) / 100,
                        balance: Math.round(Number(message.balance) * 100) / 100,
                        floating_pl: Math.round(Number(message.floating_pl) * 100) / 100,
                        daily_drawdown: dailyLoss,
                        daily_remaining: dailyRemaining,
                        max_drawdown: totalLoss,
                        total_remaining: totalRemaining,
                        timestamp: bridgeTimestamp
                    });

                    if (LATENCY_DEBUG) {
                        const endProcessing = performance.now();
                        const processingTime = (endProcessing - startProcessing).toFixed(2);
                        const bridgeLat = (Date.now() - bridgeTimestamp);
                        console.log(`⏱️ [WS_LATENCY] Login: ${login} | Bridge→Relay: ${bridgeLat}ms | Processing: ${processingTime}ms`);
                    }
                }


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
            rooms: [],
            bridge: { status: bridgeStatus, error: lastBridgeError }
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
    if (!io) return;
    const roomName = `challenge_${challengeId}`;
    const roomSize = io?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;
    if (DEBUG) console.log(`📤 trade_update → ${roomName} (${roomSize} listeners)`);
    io.to(roomName).emit('trade_update', trade);
}

export function broadcastBalanceUpdate(challengeId: string, balanceData: any) {
    if (!io) return;
    const roomName = `challenge_${challengeId}`;
    const roomSize = io?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;
    // if (DEBUG) console.log(`📤 balance_update → ${roomName} (${roomSize} listeners)`, { equity: balanceData.equity, floating_pl: balanceData.floating_pl });
    io.to(roomName).emit('balance_update', {
        ...balanceData,
        challenge_id: challengeId
    });
}

export function broadcastToUser(userId: string, event: string, data: any) {
    if (!io) return;
    io.to(`user_${userId}`).emit(event, data);
    if (DEBUG) console.log(` Broadcasted ${event} to user: ${userId}`);
}

export function broadcastLeaderboard(competitionId: string, leaderboard: any[]) {
    if (!io) return;
    const roomName = `competition_${competitionId}`;
    io.to(roomName).emit('leaderboard_update', leaderboard);
    if (DEBUG) console.log(` Broadcasted leaderboard update for ${competitionId} (Rows: ${leaderboard.length})`);
}
