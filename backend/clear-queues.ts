import { riskQueue, syncQueue } from './src/lib/queue';

async function clearQueues() {
    console.log('🧹 Clearing all jobs from queues...');
    try {
        await riskQueue.drain();
        await riskQueue.obliterate({ force: true });
        console.log('✅ Risk Queue cleared.');

        await syncQueue.drain();
        await syncQueue.obliterate({ force: true });
        console.log('✅ Sync Queue cleared.');

        console.log('\n🚀 Queues are now empty. Please restart your backend server.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to clear queues:', err);
        process.exit(1);
    }
}

clearQueues();
