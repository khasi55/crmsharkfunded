
import { syncQueue, riskQueue } from '../lib/queue';
import { getRedis } from '../lib/redis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function diagnoseSync() {
    console.log("🔍 Diagnosing Sync Infrastructure...");

    const redis = getRedis();
    try {
        const info = await redis.info();
        console.log("✅ Redis connection established.");
        // console.log("Redis Info (Partial):", info.split('\n').slice(0, 5).join('\n'));
    } catch (e: any) {
        console.error("❌ Redis connection failed:", e.message);
        return;
    }

    try {
        const syncJobCount = await syncQueue.getJobCounts();
        const riskJobCount = await riskQueue.getJobCounts();

        console.log("📊 Sync Queue Job Counts:", syncJobCount);
        console.log("📊 Risk Queue Job Counts:", riskJobCount);

        if (syncJobCount.waiting === 0 && syncJobCount.active === 0 && syncJobCount.completed === 0) {
            console.log("⚠️ Sync Queue seems empty. No automated jobs have been dispatched recently?");
        }

    } catch (e: any) {
        console.error("❌ Error fetching queue status:", e.message);
    }

    process.exit(0);
}

diagnoseSync();
