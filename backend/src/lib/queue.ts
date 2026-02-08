
import { Queue } from 'bullmq';
import { getRedis } from './redis';

// Define the Queue for Risk Engine Events
// This replaces the Redis Pub/Sub model with a persistent Job Queue
export const riskQueue = new Queue('risk-queue', {
    connection: getRedis() as any,
    defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 for debugging
        removeOnFail: 500,     // Keep failed jobs for inspection
        attempts: 3,           // Retry up to 3 times on crash/failure
        backoff: {
            type: 'exponential',
            delay: 1000        // Wait 1s, 2s, 4s between retries
        }
    }
});

// Define the Queue for Trade Synchronization
// Dispatched by scheduler, processed by workers in parallel
export const syncQueue = new Queue('sync-queue', {
    connection: getRedis() as any,
    defaultJobOptions: {
        removeOnComplete: true, // Auto-remove successful syncs to save Redis memory
        removeOnFail: 100,     // Keep some failures for debugging
        attempts: 2,           // Retry once
        backoff: {
            type: 'fixed',
            delay: 5000        // Wait 5s before retry
        }
    }
});
