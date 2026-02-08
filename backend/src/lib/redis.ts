import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

if (!REDIS_URL) {
    console.error('❌ Redis URL not found in environment variables! Defaults may fail.');
}

// Singleton instances
let client: Redis | null = null;
let subscriber: Redis | null = null;

/**
 * Get the singleton Redis client for general commands (SET, GET, PUBLISH, etc.)
 */
export function getRedis(): Redis {
    if (!client) {
        if (DEBUG) console.log('🔌 Initializing Redis Singleton...');

        client = new Redis(REDIS_URL || '', {
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,
            connectionName: 'RE_MAIN_SINGLETON',
            retryStrategy(times) {
                return Math.min(times * 100, 3000);
            },
        });

        client.on('connect', () => {
            if (DEBUG) console.log('🟢 Redis Singleton Connected');
            // Try to set eviction police if possible, but don't crash
            try {
                client?.config('SET', 'maxmemory-policy', 'noeviction').catch(() => { });
            } catch (e) { }
        });

        client.on('error', (e) => {
            console.error('🔴 Redis Singleton Error:', e.message);
        });
    }
    return client;
}

/**
 * Get the singleton Redis Subscriber (for SUBSCRIBE only)
 */
export function getRedisSub(): Redis {
    if (!subscriber) {
        if (DEBUG) console.log('🔌 Initializing Redis Subscriber Singleton...');

        subscriber = new Redis(REDIS_URL || '', {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            connectionName: 'RE_SUB_SINGLETON',
            retryStrategy(times) {
                return Math.min(times * 100, 3000);
            },
        });

        subscriber.on('connect', () => {
            if (DEBUG) console.log('🟡 Redis Subscriber Connected');
        });

        subscriber.on('error', (e) => {
            console.error('🔴 Redis Subscriber Error:', e.message);
        });
    }
    return subscriber;
}

// ⚠️ DEPRECATED: Do not use this directly in new code. 
// Kept temporarily for backward compatibility while refactoring, 
// using a getter to ensure it calls getRedis() on access.
// Ideally, we remove this to force compilation errors in files we missed.
export const redis = new Proxy({}, {
    get: function (target, prop) {
        // If they try to access properties of 'redis', we redirect to the singleton
        return (getRedis() as any)[prop];
    }
}) as Redis;
