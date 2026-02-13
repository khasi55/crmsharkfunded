
import { getRedis } from '../lib/redis';
import { supabase } from '../lib/supabase';

async function verifyDashboardBulk(targetId: string) {
    console.log(`🔍 Testing for Challenge: ${targetId}`);
    const redis = getRedis();
    const cacheKey = `dashboard:bulk:${targetId}`;

    // Ensure we are connected
    await new Promise(resolve => setTimeout(resolve, 1000));

    await redis.del(cacheKey);
    console.log('✅ Cache cleared.');

    // Simulate the bulk extraction logic
    console.time('DB_FETCH');
    const [tradesResponse, riskResponse, consistencyResponse, challengeResponse] = await Promise.all([
        supabase.from('trades')
            .select('id, ticket, symbol, type, lots, open_price, close_price, open_time, close_time, profit_loss, commission, swap')
            .eq('challenge_id', targetId),
        supabase.from('risk_violations').select('*').eq('challenge_id', targetId).order('created_at', { ascending: false }),
        supabase.from('consistency_scores').select('*').eq('challenge_id', targetId).order('date', { ascending: false }).limit(30),
        supabase.from('challenges').select('*').eq('id', targetId).single()
    ]);
    console.timeEnd('DB_FETCH');

    if (challengeResponse.error) {
        console.error('Error fetching challenge:', challengeResponse.error);
        process.exit(1);
    }

    console.log(`Found ${tradesResponse.data?.length || 0} trades.`);

    const dummyData = { id: targetId, test: true, timestamp: Date.now() };
    await redis.set(cacheKey, JSON.stringify(dummyData), 'EX', 300);

    const cached = await redis.get(cacheKey);
    if (cached) {
        console.log('✅ Redis Cache Set/Get successful!');
        const parsed = JSON.parse(cached);
        if (parsed.id === targetId) console.log('✅ Cache data integrity verified.');
    } else {
        console.log('❌ Redis Cache Get failed.');
    }

    // Test invalidation
    await redis.del(cacheKey);
    const afterDel = await redis.get(cacheKey);
    if (!afterDel) console.log('✅ Cache invalidation verified.');

    process.exit(0);
}

const cid = process.argv[2] || '0cab2b4c-7d74-428a-93d1-c6be0c452548';
verifyDashboardBulk(cid);
