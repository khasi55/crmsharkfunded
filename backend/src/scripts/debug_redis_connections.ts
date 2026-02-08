import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    console.error('❌ REDIS_URL not found in .env');
    process.exit(1);
}

// Create a new dedicated connection for debugging
// We use a separate connection to avoid interfering with the app singleton if running locally
const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy: (times) => {
        if (times > 1) return null; // Don't retry if full
        return 1000;
    }
});

async function run() {
    try {
        console.log("🔌 Connecting to Redis...");

        // 1. Check Max Clients Config
        let maxClients = 'unknown';
        try {
            const config = await redis.config('GET', 'maxclients') as any;
            if (config && config.length >= 2) maxClients = config[1];
        } catch (e) {
            console.warn("⚠️ Could not fetch maxclients config (might be restricted).");
        }

        // 2. Client List
        const clientListRaw = await redis.client('LIST') as string;
        const lines = clientListRaw.split('\n').filter(l => l.trim().length > 0);

        console.log(`\n📊 Redis Client Stats`);
        console.log(`   Total Connected: ${lines.length} / ${maxClients}`);

        // 3. Analysis
        const byName: Record<string, number> = {};
        const byAge: Record<string, number> = {
            '< 1m': 0,
            '1m - 1h': 0,
            '> 1h': 0,
            '> 24h': 0
        };

        let zombieCount = 0;

        lines.forEach(line => {
            const kv: Record<string, string> = {};
            line.split(' ').forEach(part => {
                const [k, v] = part.split('=');
                if (k && v) kv[k] = v;
            });

            // Name Analysis
            const name = kv['name'] || 'unknown';
            byName[name] = (byName[name] || 0) + 1;

            // Age Analysis
            const ageSeconds = parseInt(kv['age'] || '0', 10);
            if (ageSeconds < 60) byAge['< 1m']++;
            else if (ageSeconds < 3600) byAge['1m - 1h']++;
            else if (ageSeconds < 86400) byAge['> 1h']++;
            else byAge['> 24h']++;

            if (ageSeconds > 3600 && name === 'unknown') {
                zombieCount++;
            }
        });

        console.log('\n🔹 Connections by Name:');
        console.table(byName);

        console.log('\n🔹 Connections by Age:');
        console.table(byAge);

        if (process.argv.includes('cleanup')) {
            console.log("\n🧹 CLEANUP MODE ENABLED");
            let killedCount = 0;

            for (const line of lines) {
                const kv: Record<string, string> = {};
                line.split(' ').forEach(part => {
                    const [k, v] = part.split('=');
                    if (k && v) kv[k] = v;
                });

                const id = kv['id'];
                const age = parseInt(kv['age'] || '0', 10);
                const name = kv['name'];

                // Kill if:
                // 1. Age > 300s (5 mins) AND Name is unknown (Zombie)
                // 2. Age > 3600s (1 hour) AND Name is NOT the current debugger
                const isZombie = (age > 300 && !name) || (age > 3600 && name !== 'DEBUG_SCRIPT');

                if (isZombie && id) {
                    try {
                        console.log(`Killing client id=${id} (age=${age}s, name=${name || 'unknown'})...`);
                        await redis.client('KILL', 'ID', id);
                        killedCount++;
                    } catch (e: any) {
                        console.error(`Failed to kill ${id}: ${e.message}`);
                    }
                }
            }
            console.log(`\n✅ Killed ${killedCount} connections.`);
        } else if (zombieCount > 0) {
            console.warn(`\n⚠️ FOUND ${zombieCount} POTENTIAL ZOMBIES (Unknown name, > 1h age)`);
            console.warn(`   Run with 'cleanup' argument to kill them: npx ts-node src/scripts/debug_redis_connections.ts cleanup`);
        }

        if (lines.length > 9000) { // Assuming default 10k
            console.error("\n🚨 CRITICAL: Redis is near capacity!");
        }

    } catch (e: any) {
        console.error("\n❌ FAILED to connect or debug Redis:", e.message);
        if (e.message.includes("max number of clients")) {
            console.error("   -> The server is FULL. You must restart Redis manually.");
        }
    } finally {
        redis.disconnect();
    }
}

run();
