import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { CoreRiskEngine } from './engine/risk-engine-core';
import { AdvancedRiskEngine } from './engine/risk-engine-advanced';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { authenticate, requireRole } from './middleware/auth';

import path from 'path';

// Force load .env from current working directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DEBUG = process.env.DEBUG === 'true';
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || 'sharkfunded_internal_bridge_key_2026';

// SILENCE BULLMQ EVICTION WARNING
const originalWarn = console.warn;
console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Eviction policy')) return;
    originalWarn(...args);
};

const app = express();
// Trust only the first proxy (load balancer) - prevents IP spoofing
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// 🛡️ SECURITY HEADERS (HELMET)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.supabase.co"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "blob:", "data:", "https://*.supabase.co"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://api.sharkfunded.co", "https://api.sharkfunded.com", "wss://*.supabase.co", "ws://localhost:3001", "http://localhost:3001", "ws://127.0.0.1:3001", "http://127.0.0.1:3001"],
            frameSrc: ["'self'", "https://*.supabase.co", "https://sharkpay-o9zz.vercel.app", "https://*.cregis.io"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
    },
    xssFilter: true,
    noSniff: true,
    frameguard: {
        action: 'sameorigin',
    },
}));

import { globalLimiter, sensitiveLimiter } from './middleware/rate-limit';

app.use('/api/', globalLimiter);
app.use('/api/admin/login', sensitiveLimiter);
app.use('/api/auth/login', sensitiveLimiter);

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
            process.env.FRONTEND_URL?.replace(/\/$/, ''),
            process.env.ADMIN_URL?.replace(/\/$/, '')
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
    const log = `[${new Date().toISOString()}] ${req.method} ${req.path} - RAW\n`;
    fs.appendFileSync('backend_request_debug.log', log);
    if (process.env.NODE_ENV === 'development' || true) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// Supabase Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

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
import paymentsRouter from './routes/payments';
import authSessionRouter from './routes/auth_session';

app.use('/api/auth', authSessionRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/config', publicConfigRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/admin/payments', adminPaymentRouter);
app.use('/api/admin/email', adminEmailRouter);
app.use('/api/admin/notifications', adminNotificationsRouter);
app.use('/api/admin/health', adminHealthRouter);
app.use('/api/payouts', payoutsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api/affiliates', affiliateRouter);
app.use('/api/user', userRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/mt5', mt5Router);
app.use('/api/kyc', kycRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/admin/affiliate', adminAffiliateRouter);
app.use('/api/admin/affiliates', adminAffiliateRouter);
app.use('/api/admin/risk', adminRiskRouter);
app.use('/api/admin/coupons', adminCouponsRouter);
app.use('/api/competitions', competitionsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/objectives', objectivesRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/email', emailRouter);
app.use('/api/event', eventRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public-performance', publicRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/payments', paymentsRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'risk-engine' });
});

// 🛡️ SECURE BRIDGE VALIDATION
app.post('/api/risk/validate', async (req, res) => {
    try {
        const bridgeKey = req.headers['x-bridge-key'];
        if (bridgeKey !== BRIDGE_API_KEY) {
            res.status(403).json({ error: 'Forbidden: Invalid Bridge Key' });
            return;
        }

        const { trade } = req.body;
        if (!trade || !trade.challenge_id) {
            res.status(400).json({ error: 'Invalid trade data' });
            return;
        }

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

// 🛡️ SECURE DEBUG ROUTE
import v8 from 'v8';
app.get('/debug/memory', authenticate, requireRole(['super_admin']), (req, res) => {
    const memory = process.memoryUsage();
    const heap = v8.getHeapStatistics();

    res.json({
        usage: {
            rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        },
        limits: {
            max_heap_size: `${Math.round(heap.heap_size_limit / 1024 / 1024)} MB`
        }
    });
});

app.use((err: any, req: any, res: any, next: any) => {
    const logMessage = `[${new Date().toISOString()}] ERROR: ${err.message}\n${err.stack}\n\n`;
    fs.appendFileSync('backend_error_debug.log', logMessage);

    if (req.body && Object.keys(req.body).length > 0) {
        fs.appendFileSync('backend_error_debug.log', `BODY: ${JSON.stringify(req.body)}\n\n`);
    }

    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start Schedulers
import { startRiskMonitor } from './services/risk-scheduler';
import { startAdvancedRiskMonitor } from './services/advanced-risk-scheduler';
import { startDailyEquityReset } from './services/daily-equity-reset';
import { startTradeSyncScheduler } from './services/trade-sync-scheduler';
import { startRiskEventWorker } from './workers/risk-event-worker';
import { startTradeSyncWorker } from './workers/trade-sync-worker';
import { closeRedisConnections } from './lib/redis';

startRiskMonitor(5);
startAdvancedRiskMonitor();
startDailyEquityReset();
startTradeSyncScheduler();
const tradeSyncWorker = startTradeSyncWorker();
const riskWorker = startRiskEventWorker();

// Initialize Socket.IO
import { createServer } from 'http';
import { initializeSocket, initializeBridgeWS } from './services/socket';

const httpServer = createServer(app);
initializeSocket(httpServer);
initializeBridgeWS();

const server = httpServer.listen(PORT, () => {
    if (DEBUG) console.log(`✅ Sharkfunded CRM Backend running on port ${PORT}`);
});

// GLOBAL ERROR HANDLERS
process.on('uncaughtException', (err) => {
    console.error(' CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

async function gracefulShutdown(signal: string) {
    server.close(async () => {
        try {
            const syncWk = await tradeSyncWorker;
            if (syncWk) await syncWk.close();

            const worker = await riskWorker;
            if (worker) await worker.close();

            await closeRedisConnections();
            process.exit(0);
        } catch (err) {
            console.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('message', (msg) => {
    if (msg === 'shutdown') {
        gracefulShutdown('PM2_SHUTDOWN');
    }
});
