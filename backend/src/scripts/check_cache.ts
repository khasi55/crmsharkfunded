
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load Frontend env for Redis (since we found it there)
const envPath = path.resolve(process.cwd(), '../frontend/.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("REDIS_URL not found in environment");
    process.exit(1);
}

const redis = new Redis(redisUrl);

async function main() {
    const challengeIds = [
        'd63586f7-cc1a-415d-9609-682d21c063fa',
        'df6778f7-d7c7-4f20-8168-03a6485f7bfb',
        '378ad919-3518-4468-bbaa-01d7dcfa23dd',
        '9504eabc-077e-4b89-9f24-f3a6f282a275'
    ];

    for (const id of challengeIds) {
        const key = `dashboard:bulk:${id}`;
        console.log(`Checking Redis key: ${key}`);
        const value = await redis.get(key);

        if (value) {
            console.log("CACHE HIT! Clearing...");
            await redis.del(key);
            console.log("Cache cleared for " + id);
        } else {
            console.log("CACHE MISS - Key not found for " + id);
        }
    }

    redis.disconnect();
}

main();
