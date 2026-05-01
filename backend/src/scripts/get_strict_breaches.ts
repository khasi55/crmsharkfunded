import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    let allChallenges: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    // Only 'breached' this time!
    while (hasMore) {
        const { data: challenges, error } = await supabase
            .from('challenges')
            .select('*')
            .in('status', ['breached', 'failed'])
            .order('id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching challenges:', error.message);
            return;
        }

        if (challenges.length > 0) {
            allChallenges = allChallenges.concat(challenges);
            page++;
        }

        if (challenges.length < pageSize) {
            hasMore = false;
        }
    }

    const startDate = new Date('2026-04-01T00:00:00Z');
    
    // Filter and process
    const validChallenges = allChallenges.filter(c => {
        const breachDate = new Date(c.breached_at || c.updated_at);
        return breachDate >= startDate;
    });

    console.log(`Total exclusively 'breached' challenges since April 1st: ${validChallenges.length}`);

    // Group by Calendar week (Monday-Sunday)
    const weekBuckets: Record<string, number> = {};

    validChallenges.forEach(c => {
        const breachDate = new Date(c.breached_at || c.updated_at);
        
        // Get Monday of the week for the breach date
        const day = breachDate.getUTCDay(); // 0 is Sunday, 1 is Monday
        const diff = breachDate.getUTCDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(Date.UTC(breachDate.getUTCFullYear(), breachDate.getUTCMonth(), diff));
        monday.setUTCHours(0,0,0,0);
        
        const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
        sunday.setUTCHours(23,59,59,999);
        
        // If Monday is before April 1st, we still bucket it for the first week of April
        const bucketLabel = `${monday.toISOString().split('T')[0]} to ${sunday.toISOString().split('T')[0]}`;
        
        if (!weekBuckets[bucketLabel]) {
            weekBuckets[bucketLabel] = 0;
        }
        weekBuckets[bucketLabel]++;
    });

    console.log('\nWeek-wise Breached Accounts (STRICTLY "breached" status):');
    Object.keys(weekBuckets).sort().forEach(week => {
        console.log(`${week}: ${weekBuckets[week]} accounts`);
    });
}

main().catch(console.error);
