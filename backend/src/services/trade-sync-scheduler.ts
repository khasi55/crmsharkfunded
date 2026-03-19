import { syncQueue } from '../lib/queue';
import { supabase } from '../lib/supabase';

const DEBUG = process.env.DEBUG === 'true'; // STRICT: Silence dispatcher logs in dev

// Increase SYNC_INTERVAL_MS from 1 minute to 5 minutes to reduce DB reads/writes
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startTradeSyncScheduler() {
    if (DEBUG || true) console.log(`🚀 [Trade Sync] Dispatcher started. Scalability: Enabled. Interval: ${SYNC_INTERVAL_MS / 1000}s`);
    runTradeSync();
    setInterval(runTradeSync, SYNC_INTERVAL_MS);
}

let isDispatching = false;

async function runTradeSync() {
    if (isDispatching) {
        console.log(" [Trade Sync] Dispatch already in progress. Skipping.");
        return;
    }
    isDispatching = true;
    try {
        if (DEBUG || true) console.log("📡 [Trade Sync] Dispatching bulk sync jobs...");

        // 1. Fetch ALL Active Challenges with Pagination (Scales to 10k+)
        let challenges: any[] = [];
        let from = 0;
        let hasMore = true;
        const PAGE_SIZE = 500;

        while (hasMore) {
            const { data, error } = await supabase
                .from('challenges')
                .select('id, user_id, login, created_at')
                .eq('status', 'active')
                .order('id', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

            if (error || !data) {
                if (DEBUG) console.log("❌ [Trade Sync] Error fetching challenges:", error);
                break;
            }

            challenges = [...challenges, ...data];
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                from += PAGE_SIZE;
            }
        }

        if (challenges.length === 0) {
            if (DEBUG) console.log("ℹ️ No active accounts to sync.");
            return;
        }

        // if (DEBUG) console.log(`📦 Found ${challenges.length} active accounts. Injecting into queue...`);

        // 2. Dispatch Each Account as a Job
        // BullMQ handles the massive injection efficiently.
        const jobs = challenges.map(challenge => ({
            name: `sync-${challenge.login}`,
            data: {
                challengeId: challenge.id,
                userId: challenge.user_id,
                login: Number(challenge.login),
                createdAt: challenge.created_at
            }
        }));

        // Bulk add for maximum performance
        await syncQueue.addBulk(jobs);

        if (DEBUG || true) console.log(`✅ [Trade Sync] Successfully dispatched ${challenges.length} jobs to Sync Worker.`);

    } catch (e: any) {
        if (!e.message?.includes('Connection is closed')) {
            console.error("❌ [Trade Sync] Dispatch Error:", e);
        }
    } finally {
        isDispatching = false;
    }
}
