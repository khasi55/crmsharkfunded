import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';


if (!REDIS_URL) {
    console.error('❌ Redis URL not found in environment variables!');
}

// Global Redis Client (Publisher/General Use)
export const redis = new Redis(REDIS_URL || '', {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('error', (err) => console.error('🔴 Redis Client Error:', err));
redis.on('connect', () => {
    if (DEBUG) console.log('🟢 Redis Client Connected');
});
