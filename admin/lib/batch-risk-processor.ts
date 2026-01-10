/**
 * Batch Risk Processor
 * 
 * High-performance batch processing system for analyzing risk across
 * thousands of accounts without crashing.
 * 
 * Features:
 * - Batch processing with configurable concurrency
 * - Circuit breaker pattern for fault tolerance
 * - Retry logic with exponential backoff
 * - Progress tracking and resumability
 * - Detailed error reporting
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RiskEngine, Trade, RiskCheckResult } from './risk-engine';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BatchConfig {
    batchSize?: number;           // Number of accounts per batch (default: 100)
    maxConcurrent?: number;        // Max concurrent batches (default: 10)
    timeoutMs?: number;            // Timeout per batch in ms (default: 30000)
    retryAttempts?: number;        // Max retry attempts (default: 3)
    retryDelayMs?: number;         // Initial retry delay (default: 1000)
}

export interface BatchResult {
    totalAccounts: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    processingTimeMs: number;
    errors: BatchError[];
    metrics: ProcessingMetrics;
}

export interface BatchError {
    challengeId: string;
    error: string;
    attemptCount: number;
    timestamp: Date;
}

export interface ProcessingMetrics {
    accountsPerSecond: number;
    averageLatencyMs: number;
    cacheHitRate: number;
    circuitBreakerTrips: number;
}

interface AccountBatch {
    challengeIds: string[];
    batchIndex: number;
}

// ============================================
// BATCH RISK PROCESSOR CLASS
// ============================================

export class BatchRiskProcessor {
    private supabase: SupabaseClient;
    private riskEngine: RiskEngine;
    private config: Required<BatchConfig>;

    // Circuit breaker state
    private circuitBreakerOpen = false;
    private circuitBreakerFailures = 0;
    private circuitBreakerLastCheck = Date.now();
    private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
    private readonly CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute

    // Metrics tracking
    private metrics = {
        totalProcessed: 0,
        totalLatencyMs: 0,
        cacheHits: 0,
        cacheTotal: 0,
        circuitBreakerTrips: 0,
    };

    constructor(supabase: SupabaseClient, config?: BatchConfig) {
        this.supabase = supabase;
        this.riskEngine = new RiskEngine(supabase);

        // Set defaults
        this.config = {
            batchSize: config?.batchSize || 100,
            maxConcurrent: config?.maxConcurrent || 10,
            timeoutMs: config?.timeoutMs || 30000,
            retryAttempts: config?.retryAttempts || 3,
            retryDelayMs: config?.retryDelayMs || 1000,
        };
    }

    /**
     * Process multiple accounts in batches
     */
    async processAccounts(challengeIds: string[]): Promise<BatchResult> {
        const startTime = Date.now();
        const errors: BatchError[] = [];
        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;

        console.log(`🚀 Starting batch processing: ${challengeIds.length} accounts`);
        console.log(`📊 Config: ${this.config.batchSize} per batch, ${this.config.maxConcurrent} concurrent`);

        try {
            // Split into batches
            const batches = this.createBatches(challengeIds);
            console.log(`📦 Created ${batches.length} batches`);

            // Process batches with concurrency control
            for (let i = 0; i < batches.length; i += this.config.maxConcurrent) {
                const batchGroup = batches.slice(i, i + this.config.maxConcurrent);

                console.log(`⚙️  Processing batch group ${Math.floor(i / this.config.maxConcurrent) + 1}/${Math.ceil(batches.length / this.config.maxConcurrent)}`);

                // Process batches in parallel
                const results = await Promise.allSettled(
                    batchGroup.map(batch => this.processBatchWithRetry(batch))
                );

                // Collect results
                results.forEach((result, idx) => {
                    if (result.status === 'fulfilled') {
                        successCount += result.value.successCount;
                        failureCount += result.value.failureCount;
                        skippedCount += result.value.skippedCount;
                        errors.push(...result.value.errors);
                    } else {
                        const batch = batchGroup[idx];
                        failureCount += batch.challengeIds.length;
                        errors.push({
                            challengeId: `batch_${batch.batchIndex}`,
                            error: result.reason?.message || 'Unknown batch error',
                            attemptCount: this.config.retryAttempts,
                            timestamp: new Date(),
                        });
                    }
                });
            }

        } catch (error) {
            console.error('❌ Fatal error in batch processing:', error);
            throw error;
        }

        const processingTimeMs = Date.now() - startTime;

        const batchResult: BatchResult = {
            totalAccounts: challengeIds.length,
            successCount,
            failureCount,
            skippedCount,
            processingTimeMs,
            errors,
            metrics: this.calculateMetrics(processingTimeMs, challengeIds.length),
        };

        console.log(`✅ Batch processing complete:`);
        console.log(`   Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}`);
        console.log(`   Time: ${(processingTimeMs / 1000).toFixed(2)}s`);
        console.log(`   Rate: ${batchResult.metrics.accountsPerSecond.toFixed(2)} accounts/sec`);

        return batchResult;
    }

    /**
     * Process a single batch with retry logic
     */
    private async processBatchWithRetry(batch: AccountBatch): Promise<{
        successCount: number;
        failureCount: number;
        skippedCount: number;
        errors: BatchError[];
    }> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                // Check circuit breaker
                if (this.isCircuitBreakerOpen()) {
                    console.warn(`⚠️  Circuit breaker open, skipping batch ${batch.batchIndex}`);
                    return {
                        successCount: 0,
                        failureCount: 0,
                        skippedCount: batch.challengeIds.length,
                        errors: [{
                            challengeId: `batch_${batch.batchIndex}`,
                            error: 'Circuit breaker open',
                            attemptCount: attempt,
                            timestamp: new Date(),
                        }],
                    };
                }

                // Process the batch
                const result = await this.processBatch(batch);

                // Reset circuit breaker on success
                this.circuitBreakerFailures = 0;

                return result;

            } catch (error) {
                lastError = error as Error;
                console.error(`❌ Batch ${batch.batchIndex} failed (attempt ${attempt}/${this.config.retryAttempts}):`, error);

                // Increment circuit breaker failures
                this.recordCircuitBreakerFailure();

                // Wait before retry (exponential backoff)
                if (attempt < this.config.retryAttempts) {
                    const delayMs = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    console.log(`⏳ Retrying in ${delayMs}ms...`);
                    await this.sleep(delayMs);
                }
            }
        }

        // All retries failed
        return {
            successCount: 0,
            failureCount: batch.challengeIds.length,
            skippedCount: 0,
            errors: [{
                challengeId: `batch_${batch.batchIndex}`,
                error: lastError?.message || 'Unknown error',
                attemptCount: this.config.retryAttempts,
                timestamp: new Date(),
            }],
        };
    }

    /**
     * Process a single batch of accounts
     */
    private async processBatch(batch: AccountBatch): Promise<{
        successCount: number;
        failureCount: number;
        skippedCount: number;
        errors: BatchError[];
    }> {
        const batchStartTime = Date.now();
        const errors: BatchError[] = [];
        let successCount = 0;
        let failureCount = 0;

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Batch timeout')), this.config.timeoutMs);
        });

        try {
            // Process all accounts in this batch
            const processPromise = Promise.allSettled(
                batch.challengeIds.map(async (challengeId) => {
                    try {
                        await this.processAccount(challengeId);
                        successCount++;
                    } catch (error) {
                        failureCount++;
                        errors.push({
                            challengeId,
                            error: (error as Error).message,
                            attemptCount: 1,
                            timestamp: new Date(),
                        });
                    }
                })
            );

            // Race between processing and timeout
            await Promise.race([processPromise, timeoutPromise]);

        } catch (error) {
            if ((error as Error).message === 'Batch timeout') {
                console.warn(`⏱️  Batch ${batch.batchIndex} timed out after ${this.config.timeoutMs}ms`);
                throw error;
            }
            throw error;
        }

        // Update metrics
        const batchLatencyMs = Date.now() - batchStartTime;
        this.metrics.totalProcessed += batch.challengeIds.length;
        this.metrics.totalLatencyMs += batchLatencyMs;

        return { successCount, failureCount, skippedCount: 0, errors };
    }

    /**
     * Process a single account (fetch latest trades and check risk)
     */
    private async processAccount(challengeId: string): Promise<void> {
        const accountStartTime = Date.now();

        try {
            // Fetch recent trades for this account
            const { data: trades, error } = await this.supabase
                .from('trades')
                .select('*')
                .eq('challenge_id', challengeId)
                .order('open_time', { ascending: false })
                .limit(100); // Limit for performance

            if (error) throw error;
            if (!trades || trades.length === 0) return; // No trades to analyze

            // Check risk for the most recent trade
            // Check risk for the most recent trade
            const latestTrade = trades[0] as Trade;
            const riskResult = await this.riskEngine.checkTrade(latestTrade);

            // Persist Violations
            if (riskResult.violations.length > 0) {
                console.log(`⚠️ Account ${challengeId} has ${riskResult.violations.length} violations`);
                for (const violation of riskResult.violations) {
                    await this.riskEngine.logViolation(challengeId, latestTrade.user_id, violation);
                }
            }

            // Handle Breach (Fail Account)
            if (riskResult.is_breached) {
                console.warn(`🚨 Account ${challengeId} BREACHED risk rules! Failing account...`);
                await this.supabase
                    .from('challenges')
                    .update({ status: 'failed', ended_at: new Date() })
                    .eq('id', challengeId)
                    .eq('status', 'active'); // Only fail active accounts
            }

            // Track cache hits (if using cache in future)
            this.metrics.cacheTotal++;

        } catch (error) {
            console.error(`Error processing account ${challengeId}:`, error);
            throw error;
        }
    }

    /**
     * Create batches from array of challenge IDs
     */
    private createBatches(challengeIds: string[]): AccountBatch[] {
        const batches: AccountBatch[] = [];

        for (let i = 0; i < challengeIds.length; i += this.config.batchSize) {
            batches.push({
                challengeIds: challengeIds.slice(i, i + this.config.batchSize),
                batchIndex: Math.floor(i / this.config.batchSize),
            });
        }

        return batches;
    }

    /**
     * Circuit breaker management
     */
    private isCircuitBreakerOpen(): boolean {
        // Reset circuit breaker after timeout
        if (this.circuitBreakerOpen && Date.now() - this.circuitBreakerLastCheck > this.CIRCUIT_BREAKER_RESET_MS) {
            console.log('🔓 Circuit breaker reset');
            this.circuitBreakerOpen = false;
            this.circuitBreakerFailures = 0;
        }

        return this.circuitBreakerOpen;
    }

    private recordCircuitBreakerFailure(): void {
        this.circuitBreakerFailures++;
        this.circuitBreakerLastCheck = Date.now();

        if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
            console.warn('🔒 Circuit breaker opened due to repeated failures');
            this.circuitBreakerOpen = true;
            this.metrics.circuitBreakerTrips++;
        }
    }

    /**
     * Calculate processing metrics
     */
    private calculateMetrics(totalTimeMs: number, totalAccounts: number): ProcessingMetrics {
        return {
            accountsPerSecond: (totalAccounts / totalTimeMs) * 1000,
            averageLatencyMs: this.metrics.totalProcessed > 0
                ? this.metrics.totalLatencyMs / this.metrics.totalProcessed
                : 0,
            cacheHitRate: this.metrics.cacheTotal > 0
                ? (this.metrics.cacheHits / this.metrics.cacheTotal) * 100
                : 0,
            circuitBreakerTrips: this.metrics.circuitBreakerTrips,
        };
    }

    /**
     * Utility: Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current processing statistics
     */
    public getStats() {
        return {
            ...this.metrics,
            circuitBreakerOpen: this.circuitBreakerOpen,
            circuitBreakerFailures: this.circuitBreakerFailures,
        };
    }

    /**
     * Reset all metrics and circuit breaker
     */
    public reset(): void {
        this.metrics = {
            totalProcessed: 0,
            totalLatencyMs: 0,
            cacheHits: 0,
            cacheTotal: 0,
            circuitBreakerTrips: 0,
        };
        this.circuitBreakerOpen = false;
        this.circuitBreakerFailures = 0;
        this.circuitBreakerLastCheck = Date.now();
    }
}
