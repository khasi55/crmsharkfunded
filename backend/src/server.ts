import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { CoreRiskEngine } from './engine/risk-engine-core';
import { AdvancedRiskEngine } from './engine/risk-engine-advanced';
import fs from 'fs';

dotenv.config();

const DEBUG = process.env.DEBUG === 'true'; // STRICT: No logs even in dev unless DEBUG=true

// SILENCE BULLMQ EVICTION WARNING (As requested)
const originalWarn = console.warn;
console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Eviction policy')) return;
    originalWarn(...args);
};

const app = express();
app.set('trust proxy', true); // Trust reverse proxy (Nginx) to get real client IP
const PORT = process.env.PORT || 3001;


import cookieParser from 'cookie-parser';
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
            'https://app.sharkfunded.com',
            'https://admin.sharkfunded.com',
            'https://admin-six-gamma-66.vercel.app',
            'https://api.sharkfunded.co',
            'https://sharkfunded.co',
            'https://www.sharkfunded.co',
            'https://app.sharkfunded.co',
            'https://admin.sharkfunded.co',
            process.env.FRONTEND_URL,
            process.env.ADMIN_URL
        ].filter(Boolean) as string[];

        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.ngrok-free.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.path}\n`;
    fs.appendFileSync('backend_request_debug.log', log);
    // Only log in development
    const DEBUG = process.env.DEBUG === 'true';
    if (process.env.NODE_ENV === 'development' && DEBUG) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

if (DEBUG) console.log("🔄 Force Restart for Consistency Route - Updated 6 - Debugging Equity");

// Supabase Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Engines
const coreEngine = new CoreRiskEngine(supabase);
const advancedEngine = new AdvancedRiskEngine(supabase);

// Routes
import overviewRouter from './routes/overview';
import payoutsRouter from './routes/payouts';
import dashboardRouter from './routes/dashboard';
import certificatesRouter from './routes/certificates';
import affiliateRouter from './routes/affiliate';
import userRouter from './routes/user';
import couponsRouter from './routes/coupons';
import mt5Router from './routes/mt5';
import kycRouter from './routes/kyc';
import adminsRouter from './routes/admins';
import adminAffiliateRouter from './routes/admin_affiliate';
import adminRiskRouter from './routes/admin_risk';
import adminCouponsRouter from './routes/admin_coupons';
import competitionsRouter from './routes/competitions';
import webhooksRouter from './routes/webhooks';
import objectivesRouter from './routes/objectives';
import rankingRouter from './routes/ranking';
import adminSettingsRouter from './routes/admin_settings';
import adminPaymentRouter from './routes/admin_payments';
import adminHealthRouter from './routes/admin_health';
import adminUsersRouter from './routes/admin_users';
import adminEmailRouter from './routes/admin_email';
import adminNotificationsRouter from './routes/admin_notifications';
import emailRouter from './routes/email';
import eventRouter from './routes/event';
import publicConfigRouter from './routes/public_config';
import publicRouter from './routes/public';
import adminRouter from './routes/admin';
import uploadRouter from './routes/upload';

app.use('/api/overview', overviewRouter);
app.use('/api/config', publicConfigRouter);
app.use('/api/admin/users', adminUsersRouter); // Register Admin Users Route
app.use('/api/admin/settings', adminSettingsRouter); // Register Settings Route
app.use('/api/admin/payments', adminPaymentRouter); // Register Payments Route
app.use('/api/admin/email', adminEmailRouter); // Register Admin Email Route
app.use('/api/admin/notifications', adminNotificationsRouter); // Register Notifications Route

app.use('/api/admin/health', adminHealthRouter); // Register Health Route
app.use('/api/payouts', payoutsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api/user', userRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/mt5', mt5Router);
app.use('/api/kyc', kycRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/admin/affiliates', adminAffiliateRouter);
app.use('/api/admin/risk', adminRiskRouter);
app.use('/api/admin/coupons', adminCouponsRouter);
app.use('/api/competitions', competitionsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/objectives', objectivesRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/email', emailRouter);
app.use('/api/event', eventRouter);
app.use('/api/admin', adminRouter); // Register Admin Upgrade Route
app.use('/api/public-performance', publicRouter); // Register Public Performance Route
app.use('/api/upload', uploadRouter);


app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'risk-engine' });
});

app.post('/api/risk/validate', async (req, res) => {
    try {
        const { trade } = req.body;

        if (!trade || !trade.challenge_id) {
            res.status(400).json({ error: 'Invalid trade data' });
            return;
        }

        const DEBUG = process.env.DEBUG === 'true';
        if (DEBUG) console.log(`Analyzing trade ${trade.ticket_number} for challenge ${trade.challenge_id}`);

        const { data: todaysTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', trade.challenge_id)
            .gte('open_time', new Date().toISOString().split('T')[0]);

        const { data: openTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', trade.challenge_id)
            .is('close_time', null);

        const { data: rulesConfig } = await supabase.from('risk_rules_config').select('*').limit(1).single();

        const rules = {
            allow_weekend_trading: rulesConfig?.allow_weekend_trading ?? true,
            allow_news_trading: rulesConfig?.allow_news_trading ?? true,
            allow_ea_trading: rulesConfig?.allow_ea_trading ?? true,
            min_trade_duration_seconds: rulesConfig?.min_trade_duration_seconds ?? 0,
            max_single_win_percent: rulesConfig?.max_single_win_percent ?? 50
        };

        const violations = await advancedEngine.checkBehavioralRisk(
            trade,
            rules,
            todaysTrades || [],
            openTrades || []
        );


        if (violations.length > 0) {
            for (const v of violations) {
                await advancedEngine.logFlag(trade.challenge_id, trade.user_id, v);
            }
        }

        res.json({
            status: violations.length > 0 ? 'violation' : 'passed',
            violations
        });

    } catch (error: any) {
        console.error('Error in validation:', error);
        res.status(500).json({ error: error.message });
    }
});


import v8 from 'v8';
app.get('/debug/memory', (req, res) => {
    const memory = process.memoryUsage();
    const heap = v8.getHeapStatistics();

    res.json({
        usage: {
            rss: `${Math.round(memory.rss / 1024 / 1024)} MB`, // Total Physical Ram used
            heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`, // Actual Object usage
        },
        limits: {
            max_heap_size: `${Math.round(heap.heap_size_limit / 1024 / 1024)} MB` // What Node thinks is its limit
        }
    });
});

app.use((err: any, req: any, res: any, next: any) => {
    const logMessage = `[${new Date().toISOString()}] ERROR: ${err.message}\n${err.stack}\n\n`;
    fs.appendFileSync('backend_error_debug.log', logMessage);

    // Log body for debugging if it's a JSON/webhooks request
    if (req.body && Object.keys(req.body).length > 0) {
        fs.appendFileSync('backend_error_debug.log', `BODY: ${JSON.stringify(req.body)}\n\n`);
    }

    res.status(500).json({
        error: 'Internal server error',
        details: err.message,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start Scheduler
import { startRiskMonitor } from './services/risk-scheduler';
import { startAdvancedRiskMonitor } from './services/advanced-risk-scheduler';
import { startDailyEquityReset } from './services/daily-equity-reset';
import { startTradeSyncScheduler } from './services/trade-sync-scheduler';
import { startRiskEventWorker } from './workers/risk-event-worker';
import { startTradeSyncWorker } from './workers/trade-sync-worker';

import { startCompetitionScheduler } from './services/competition-scheduler';
import { startLeaderboardBroadcaster } from './services/leaderboard-service';
import { closeRedisConnections } from './lib/redis';



if (DEBUG) console.log('🔄 [Risk Monitor] Polling Enabled (Fast Mode) - 5s Interval');
startRiskMonitor(5); // Increased frequency for faster breach detection
startAdvancedRiskMonitor(); // 5m Martingale Checks
startDailyEquityReset(); // Schedule midnight reset
startTradeSyncScheduler(); // Dispatch jobs every 5m (Immediate on Restart)
// startCompetitionScheduler(); // Schedule competition status checks
// startLeaderboardBroadcaster(); // Broadcasts every 30s
const tradeSyncWorker = startTradeSyncWorker(); // SCALABILITY FIX: Process 6,000+ accounts in parallel
const riskWorker = startRiskEventWorker(); // LISTENS for 'events:trade_update' (Critical for Scalping Checks)


// Initialize Socket.IO
import { createServer } from 'http';
import { initializeSocket } from './services/socket';

const httpServer = createServer(app);
initializeSocket(httpServer);

const server = httpServer.listen(PORT, () => {
    if (DEBUG) console.log(`✅ Sharkfunded CRM Backend running on port ${PORT}`);
    if (DEBUG) {
        console.log(` WebSocket server ready`);
    }
});

// GLOBAL ERROR HANDLERS (Prevent Crashes)
process.on('uncaughtException', (err) => {
    console.error(' CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

async function gracefulShutdown(signal: string) {
    if (DEBUG) console.log(`${signal} signal received: closing HTTP server`);

    server.close(async () => {
        if (DEBUG) console.log('HTTP server closed');

        try {
            if (DEBUG) console.log('Closing Trade Sync Worker...');
            const syncWk = await tradeSyncWorker;
            if (syncWk) await syncWk.close();

            if (DEBUG) console.log('Closing Risk Worker...');
            const worker = await riskWorker;
            if (worker) await worker.close();

            await closeRedisConnections();
            if (DEBUG) console.log('✅ Graceful shutdown completed');
            process.exit(0);
        } catch (err) {
            console.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle PM2 graceful reload
process.on('message', (msg) => {
    if (msg === 'shutdown') {
        gracefulShutdown('PM2_SHUTDOWN');
    }
});
