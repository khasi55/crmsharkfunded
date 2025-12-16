/**
 * Test Endpoint for Risk Engine Scale Verification
 * 
 * This endpoint simulates processing 20k accounts to verify
 * the risk engine can handle high scale without crashing.
 * 
 * Usage: GET /api/test-scale?accounts=20000
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { BatchRiskProcessor } from '@/lib/batch-risk-processor';

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Get account count from query params (default 1000, max 20000)
        const searchParams = request.nextUrl.searchParams;
        const accountCount = Math.min(
            parseInt(searchParams.get('accounts') || '1000'),
            20000
        );

        console.log(`🧪 Test Scale: Processing ${accountCount} accounts...`);

        // Create Supabase client
        const supabase = await createClient();

        // Option 1: Use real challenge IDs from database
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('id')
            .limit(accountCount);

        let challengeIds: string[];

        if (error || !challenges || challenges.length === 0) {
            // Option 2: Generate mock challenge IDs for testing
            console.log('⚠️  No real challenges found, generating mock IDs');
            challengeIds = Array.from(
                { length: accountCount },
                (_, i) => `mock-challenge-${i + 1}`
            );
        } else {
            challengeIds = challenges.map(c => c.id);

            // Pad with mocks if needed
            if (challenges.length < accountCount) {
                const mocksNeeded = accountCount - challenges.length;
                const mockIds = Array.from(
                    { length: mocksNeeded },
                    (_, i) => `mock-challenge-${i + 1}`
                );
                challengeIds = [...challengeIds, ...mockIds];
            }
        }

        // Initialize batch processor with custom config for testing
        const processor = new BatchRiskProcessor(supabase, {
            batchSize: 100,
            maxConcurrent: 10,
            timeoutMs: 30000,
            retryAttempts: 3,
            retryDelayMs: 1000,
        });

        // Process all accounts
        const result = await processor.processAccounts(challengeIds);

        const totalTimeSeconds = (Date.now() - startTime) / 1000;

        // Return detailed results
        return NextResponse.json({
            success: true,
            test_config: {
                total_accounts: accountCount,
                batch_size: 100,
                max_concurrent: 10,
            },
            results: {
                total_accounts: result.totalAccounts,
                success_count: result.successCount,
                failure_count: result.failureCount,
                skipped_count: result.skippedCount,
                processing_time_seconds: totalTimeSeconds,
            },
            metrics: result.metrics,
            errors: result.errors.slice(0, 10), // First 10 errors only
            total_errors: result.errors.length,
            status: result.failureCount === 0 ? 'PASS' : 'PARTIAL',
            message: result.failureCount === 0
                ? `✅ Successfully processed ${accountCount} accounts without crashes!`
                : `⚠️  Processed with ${result.failureCount} failures. Check errors array.`,
        });

    } catch (error) {
        console.error('❌ Test scale endpoint failed:', error);

        return NextResponse.json({
            success: false,
            error: (error as Error).message,
            message: '❌ Test failed - system crashed',
        }, { status: 500 });
    }
}
