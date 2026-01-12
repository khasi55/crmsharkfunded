import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { CoreRiskEngine } from './engine/risk-engine-core';
import { AdvancedRiskEngine } from './engine/risk-engine-advanced';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware (Restart Triggered)
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
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
    // const log = `[${new Date().toISOString()}] ${req.method} ${req.path}\n`;
    // fs.appendFileSync('backend_request_debug.log', log);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

console.log("🔄 Force Restart for Consistency Route");

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

app.use('/api/overview', overviewRouter);
app.use('/api/admin/settings', adminSettingsRouter); // Register Settings Route
app.use('/api/admin/payments', adminPaymentRouter); // Register Payments Route

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

        console.log(`Analyzing trade ${trade.ticket_number} for challenge ${trade.challenge_id}`);

        const { data: todaysTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', trade.challenge_id)
            .gte('open_time', new Date().toISOString().split('T')[0]);

        const { data: openTrades } = await supabase.from('trades')
            .select('*')
            .eq('challenge_id', trade.challenge_id)
            .is('close_time', null);

        // Fetch Rules
        const { data: rulesConfig } = await supabase.from('risk_rules_config').select('*').limit(1).single();

        // Default rules if missing
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

        // Log violations if any
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

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
    const logMessage = `[${new Date().toISOString()}] ERROR: ${err.message}\n${err.stack}\n\n`;
    fs.appendFileSync('backend_error_debug.log', logMessage);
    res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
});

// Start Scheduler
import { startRiskMonitor } from './services/risk-scheduler';
import { startDailyEquityReset } from './services/daily-equity-reset';
import { startTradeSyncScheduler } from './services/trade-sync-scheduler';
import { startRiskEventWorker } from './workers/risk-event-worker';
import { startTradeSyncWorker } from './workers/trade-sync-worker';

startRiskMonitor(60); // Risk checks every 60s (optimized from 20s)
startRiskEventWorker(); // Start Event Listener
startDailyEquityReset(); // Schedule midnight reset
startTradeSyncScheduler(); // Dispatch jobs every 10s
startTradeSyncWorker(); // Keep Worker active for manual syncs if needed


// Initialize Socket.IO
import { createServer } from 'http';
import { initializeSocket } from './services/socket';

const httpServer = createServer(app);
initializeSocket(httpServer);

const server = httpServer.listen(PORT, () => {
    console.log(`Risk Engine Backend running on port ${PORT}`);
    console.log(`✅ WebSocket server ready`);
});

// GLOBAL ERROR HANDLERS (Prevent Crashes)
process.on('uncaughtException', (err) => {
    console.error('❌ CRITICAL: Uncaught Exception:', err);
    // Optional: Graceful shutdown logic here if state is corrupted
    // server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
