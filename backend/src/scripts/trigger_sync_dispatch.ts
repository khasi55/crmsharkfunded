
import { syncQueue } from '../lib/queue';
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function manualDispatch() {
    console.log("🚀 Manually triggering Trade Sync Dispatcher...");

    // 1. Fetch Active Challenges
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('id, user_id, login, created_at')
        .eq('status', 'active');

    if (error || !challenges) {
        console.error("❌ Error fetching challenges:", error);
        return;
    }

    console.log(`📦 Found ${challenges.length} active accounts.`);

    if (challenges.length === 0) {
        console.log("ℹ️ No active accounts to sync.");
        return;
    }

    // 2. Dispatch Each Account as a Job
    const jobs = challenges.map(challenge => ({
        name: `sync-${challenge.login}`,
        data: {
            challengeId: challenge.id,
            userId: challenge.user_id,
            login: Number(challenge.login),
            createdAt: challenge.created_at
        }
    }));

    try {
        console.log("📥 Injecting jobs into sync-queue...");
        await syncQueue.addBulk(jobs);
        console.log(`✅ Successfully dispatched ${challenges.length} jobs to Sync Worker.`);
    } catch (e: any) {
        console.error("❌ Dispatch Error:", e.message);
    }

    process.exit(0);
}

manualDispatch();
