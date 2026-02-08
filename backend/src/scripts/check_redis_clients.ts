
import dotenv from 'dotenv';
dotenv.config();
import { redis } from '../lib/redis';

async function checkRedisClients() {
    try {
        console.log("📊 Checking Redis Clients...");

        // ioredis client() returns a Promise<string>
        const clients: string = await redis.client('LIST') as string;

        if (!clients || typeof clients !== 'string') {
            console.log("⚠️ No clients returned or invalid response.");
            return;
        }

        console.log("\n--- Raw Client List (First 500 chars) ---");
        console.log(clients.substring(0, 500));

        const lines = clients.split('\n').filter(l => l.trim().length > 0);
        console.log(`\n✅ Total Clients: ${lines.length}`);

        // Analyze names
        const names: Record<string, number> = {};
        lines.forEach((line) => {
            const match = line.match(/name=([^ ]+)/);
            const name = match ? match[1] : 'unknown';
            names[name] = (names[name] || 0) + 1;
        });

        console.table(names);

    } catch (e: any) {
        console.error("❌ Failed to lists clients:", e.message);
    } finally {
        // Force exit
        process.exit(0);
    }
}

checkRedisClients();
