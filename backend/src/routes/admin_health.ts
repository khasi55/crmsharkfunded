import { Router, Response } from 'express';
import { getSocketMetrics } from '../services/socket';
import { supabase } from '../lib/supabase';
import { getRedis } from '../lib/redis';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();


const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';

// GET /api/admin/health - System health monitoring
router.get('/', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const healthData: any = {
            timestamp: new Date().toISOString(),
            services: {}
        };

        // 1. WebSocket Health
        try {
            const socketMetrics = getSocketMetrics();
            healthData.services.websocket = {
                status: 'healthy',
                connections: socketMetrics.totalConnections,
                authenticated: socketMetrics.authenticatedConnections,
                rooms: socketMetrics.roomCount,
                bridge_relay: {
                    status: socketMetrics.bridge?.status || 'unknown',
                    error: socketMetrics.bridge?.error || null
                }
            };
        } catch (error) {
            healthData.services.websocket = {
                status: 'unhealthy',
                error: (error as Error).message
            };
        }

        // 2. Database Health
        try {
            const start = Date.now();
            const { error } = await supabase.from('challenges').select('id').limit(1);
            const latency = Date.now() - start;

            healthData.services.database = {
                status: error ? 'unhealthy' : 'healthy',
                latency: `${latency}ms`,
                error: error?.message
            };
        } catch (error) {
            healthData.services.database = {
                status: 'unhealthy',
                error: (error as Error).message
            };
        }

        // 3. Redis Health
        try {
            const start = Date.now();
            await getRedis().ping();
            const latency = Date.now() - start;

            healthData.services.redis = {
                status: 'healthy',
                latency: `${latency}ms`
            };
        } catch (error) {
            healthData.services.redis = {
                status: 'unhealthy',
                error: (error as Error).message
            };
        }

        // 4. MT5 Bridge Health
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const start = Date.now();
            const response = await fetch(`${BRIDGE_URL}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'X-API-Key': process.env.MT5_API_KEY || ''
                }
            });
            clearTimeout(timeoutId);
            const latency = Date.now() - start;

            healthData.services.mt5_bridge = {
                status: response.ok ? 'healthy' : 'degraded',
                latency: `${latency}ms`,
                url: BRIDGE_URL,
                statusCode: response.status
            };
        } catch (error: any) {
            healthData.services.mt5_bridge = {
                status: 'unhealthy',
                error: error.message,
                url: BRIDGE_URL
            };
        }

        // 5. Scheduler Status
        healthData.services.schedulers = {
            risk_monitor: {
                status: 'running',
                interval: '60s'
            },
            trade_sync: {
                status: 'running',
                interval: '10min'
            },
            daily_equity_reset: {
                status: 'scheduled',
                schedule: 'midnight'
            }
        };

        // 6. System Resources
        const memUsage = process.memoryUsage();
        healthData.system = {
            memory_rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            memory_heap: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            uptime: `${Math.round(process.uptime())}s`
        };

        // Overall system status
        const allHealthy = Object.values(healthData.services).every((service: any) =>
            service.status === 'healthy' || service.status === 'running' || service.status === 'scheduled'
        );

        healthData.overall = allHealthy ? 'healthy' : 'degraded';

        res.json(healthData);

    } catch (error: any) {
        console.error('Health check error:', error);
        res.status(500).json({
            error: 'Health check failed',
            overall: 'unhealthy'
        });
    }
});

export default router;
