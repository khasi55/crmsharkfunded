import Redis from 'ioredis';

const getRedisUrl = () => {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    console.warn('⚠️ REDIS_URL is not defined. Using fallback redis://localhost:6379');
    return 'redis://localhost:6379';
};

export const redis = new Redis(getRedisUrl(), {
    lazyConnect: true, // Don't connect until used
    maxRetriesPerRequest: 1, // Fail fast if no local redis
    retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 50, 2000);
    },
});

redis.on('error', (err) => {
    // Suppress unhandled error log during development if redis is missing
    if (process.env.NODE_ENV === 'development') {
        // console.warn('Redis connection error (ignorable if not using Redis features):', err.message);
    } else {
        console.error('Redis Client Error:', err);
    }
});
