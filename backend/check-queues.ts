import { riskQueue, syncQueue } from './src/lib/queue';

async function checkHealth() {
    try {
        const riskCounts = await riskQueue.getJobCounts();
        const syncCounts = await syncQueue.getJobCounts();

        console.log('--- Risk Queue Status ---');
        console.log(JSON.stringify(riskCounts, null, 2));

        console.log('\n--- Sync Queue Status ---');
        console.log(JSON.stringify(syncCounts, null, 2));

        const failedSync = await syncQueue.getFailed(0, 5);
        if (failedSync.length > 0) {
            console.log('\n--- Recent Failed Sync Jobs ---');
            failedSync.forEach(job => {
                console.log(`Job ID: ${job.id} (Account: ${job.data.login})`);
                console.log(`Failed Reason: ${job.failedReason}`);
            });
        }

        const failedRisk = await riskQueue.getFailed(0, 5);
        if (failedRisk.length > 0) {
            console.log('\n--- Recent Failed Risk Jobs ---');
            failedRisk.forEach(job => {
                console.log(`Job ID: ${job.id}`);
                console.log(`Failed Reason: ${job.failedReason}`);
                // console.log(`Data: ${JSON.stringify(job.data)}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('Failed to check queue health:', err);
        process.exit(1);
    }
}

checkHealth();
