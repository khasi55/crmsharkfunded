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
            lazyConnect: false,
            enableOfflineQueue: true,
            // Add connection limits
            maxLoadingRetryTime: 10000,
            retryStrategy(times) {
                if (times > 10) {
                    console.error('🔴 Redis connection failed after 10 retries');
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 3000);
            },
        });

        client.on('connect', async () => {
            if (DEBUG) console.log('🟢 Redis Singleton Connected');
            // Try to set eviction policy if possible, but don't crash
            try {
                const response = await client?.config('SET', 'maxmemory-policy', 'noeviction');
                if (DEBUG) console.log(`✅ Redis Eviction Policy set to noeviction: ${response}`);
            } catch (e: any) {
                console.warn(`⚠️ Could not set Redis noeviction policy: ${e.message}`);
            }
        });

        client.on('error', (e) => {
            console.error('🔴 Redis Singleton Error:', e.message);
        });

        client.on('close', () => {
            if (DEBUG) console.log('🔴 Redis Singleton Closed');
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
            lazyConnect: false,
            enableOfflineQueue: true,
            maxLoadingRetryTime: 10000,
            retryStrategy(times) {
                if (times > 10) {
                    console.error('🔴 Redis subscriber connection failed after 10 retries');
                    return null;
                }
                return Math.min(times * 100, 3000);
            },
        });

        subscriber.on('connect', () => {
            if (DEBUG) console.log('🟡 Redis Subscriber Connected');
        });

        subscriber.on('error', (e) => {
            console.error('🔴 Redis Subscriber Error:', e.message);
        });

        subscriber.on('close', () => {
            if (DEBUG) console.log('🔴 Redis Subscriber Closed');
        });
    }
    return subscriber;
}

/**
 * Gracefully close all Redis connections
 */
export async function closeRedisConnections(): Promise<void> {
    const promises: Promise<string>[] = [];

    if (client) {
        console.log('📴 Closing Redis client...');
        promises.push(client.quit());
        client = null;
    }

    if (subscriber) {
        console.log('📴 Closing Redis subscriber...');
        promises.push(subscriber.quit());
        subscriber = null;
    }

    await Promise.all(promises);
    console.log('✅ All Redis connections closed');
}

// Graceful shutdown handlers moved to server.ts to ensure correct ordering
// (Workers must close before Redis connections)

// ⚠️ REMOVED: The proxy pattern was causing issues
// Instead, export the getter functions directly
// If you need backward compatibility, do a global find/replace:
// - Replace "redis." with "getRedis()."
// - Or add: export const redis = getRedis();
// But be aware that won't be a true singleton if destructured