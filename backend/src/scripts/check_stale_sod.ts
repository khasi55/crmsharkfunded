
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const today = new Date().toISOString().split('T')[0]; // "2026-03-20"
    console.log(`Checking for accounts NOT updated on ${today}...`);

    // Fetch active challenges
    // We'll use pagination here too just to be safe and demonstrate the fix
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
            if (data.length < PAGE_SIZE) hasMore = false;
            else from += PAGE_SIZE;
        }
    }

    console.log(`Analyzing ${allChallenges.length} active accounts...`);

    const staleAccounts = allChallenges.filter(c => {
        const updatedAt = c.updated_at ? c.updated_at.split('T')[0] : '';
        return updatedAt !== today;
    });

    if (staleAccounts.length === 0) {
        console.log("✅ All active accounts have been updated today.");
    } else {
        console.log(`❌ Found ${staleAccounts.length} stale accounts (not updated today):`);
        staleAccounts.slice(0, 10).forEach(a => {
            console.log(`  - Login: ${a.login} | Last Updated: ${a.updated_at}`);
        });
        if (staleAccounts.length > 10) {
            console.log(`  ... and ${staleAccounts.length - 10} more.`);
        }
    }
}

main();
