
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const today = new Date().toISOString().split('T')[0]; // "2026-03-20"
    console.log(`Checking for accounts NOT updated on ${today}...`);

    let allChallenges = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('challenges')
            .select('login, status, updated_at, start_of_day_equity, initial_balance')
            .eq('status', 'active')
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error("Error fetching challenges:", error);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allChallenges = [...allChallenges, ...data];
            console.log(`  Fetched ${allChallenges.length} challenges...`);
            if (data.length < PAGE_SIZE) hasMore = false;
            else from += PAGE_SIZE;
        }
    }

    console.log(`\nAnalyzing ${allChallenges.length} active accounts...`);

    const staleAccounts = allChallenges.filter(c => {
        const updatedAt = c.updated_at ? c.updated_at.split('T')[0] : '';
        return updatedAt !== today;
    });

    if (staleAccounts.length === 0) {
        console.log("✅ SUCCESS: All active accounts have been updated today.");
    } else {
        console.log(`❌ Found ${staleAccounts.length} stale accounts (not updated today):`);
        staleAccounts.forEach(a => {
            console.log(`  - Login: ${a.login} | Last Updated: ${a.updated_at}`);
        });
    }
}

main();
