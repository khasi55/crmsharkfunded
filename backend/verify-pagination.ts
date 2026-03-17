
import { supabaseAdmin } from './src/lib/supabase';

async function verifyPagination() {
    console.log("🔍 Verifying Paginated Fetch...");

    let challenges: any[] = [];
    let from = 0;
    let hasMore = true;
    const PAGE_SIZE = 500;

    while (hasMore) {
        console.log(`📡 Fetching range ${from} to ${from + PAGE_SIZE - 1}...`);
        const { data, error } = await supabaseAdmin
            .from('challenges')
            .select('id, login')
            .eq('status', 'active')
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error("❌ Error:", error.message);
            break;
        }

        if (!data) break;
        challenges = [...challenges, ...data];
        console.log(`✅ Received ${data.length} records. Total so far: ${challenges.length}`);

        if (data.length < PAGE_SIZE) {
            hasMore = false;
        } else {
            from += PAGE_SIZE;
        }
    }

    console.log(`\n🎉 Final Count: ${challenges.length}`);
    const targetInList = challenges.some(c => Number(c.login) === 900909502783);
    console.log(`🎯 Is 900909502783 in the list? ${targetInList}`);

    if (challenges.length > 1000 && targetInList) {
        console.log("✅ SUCCESS: Pagination is working and correctly fetching all accounts.");
    } else {
        console.log("❌ FAILURE: Pagination did not fetch all accounts or target account is missing.");
    }
}

verifyPagination();
