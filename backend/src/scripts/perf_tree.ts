
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function benchmark() {
    console.log("🏎️ Benchmarking Affiliate Tree Fetch...");

    // 1. Measure Standard Sequential Fetch
    const startSeq = Date.now();
    let countSeq = 0;
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    // We'll limit to 3 pages for the test to avoid waiting too long, 
    // but enough to extrapolate.
    const TEST_LIMIT_PAGES = 5;

    // Actually, let's just get the count first to know what we are dealing with
    const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('referral_code.neq.null,referred_by.not.is.null');

    console.log(`Total Records to Fetch: ${count}`);

    console.log("--- Starting Sequential Fetch (Simulation) ---");
    while (hasMore && page < TEST_LIMIT_PAGES) {
        const pStart = Date.now();
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .or('referral_code.neq.null,referred_by.not.is.null')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (data && data.length > 0) {
            countSeq += data.length;
            page++;
        } else {
            hasMore = false;
        }
        console.log(`Page ${page} took ${Date.now() - pStart}ms`);
    }
    const durationSeq = Date.now() - startSeq;
    console.log(`Sequential took ${durationSeq}ms for ${countSeq} records.`);


    // 2. Measure Parallel Fetch
    console.log("\n--- Starting Parallel Fetch (Simulation) ---");
    const startPar = Date.now();

    const pagesToFetch = Math.ceil((count || 0) / PAGE_SIZE);
    const promises = [];
    // Limit to same number of pages for fair comparison
    const limitPages = Math.min(pagesToFetch, TEST_LIMIT_PAGES);

    for (let i = 0; i < limitPages; i++) {
        promises.push(
            supabase
                .from('profiles')
                .select('id')
                .or('referral_code.neq.null,referred_by.not.is.null')
                .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
        );
    }

    const results = await Promise.all(promises);
    const countPar = results.reduce((acc, r) => acc + (r.data?.length || 0), 0);

    const durationPar = Date.now() - startPar;
    console.log(`Parallel took ${durationPar}ms for ${countPar} records.`);

    console.log(`\n🚀 Speedup: ${(durationSeq / durationPar).toFixed(2)}x`);
}

benchmark();
