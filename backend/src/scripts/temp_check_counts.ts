
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const startDate = '2026-03-18T00:00:00+05:30';
    const endDate = '2026-03-19T00:00:00+05:30';
    console.log(`Searching for breached/failed accounts updated between ${startDate} and ${endDate}...`);
    
    let allData: any[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('challenges')
            .select('login, status, updated_at')
            .in('status', ['breached', 'failed', 'disabled'])
            .gte('updated_at', startDate)
            .lt('updated_at', endDate)
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error('Error:', error);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allData = [...allData, ...data];
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                from += PAGE_SIZE;
            }
        }
    }

    const counts: Record<string, number> = {};
    allData.forEach(c => {
        const s = c.status || 'unknown';
        counts[s] = (counts[s] || 0) + 1;
    });

    console.log('Breach/Disabled Status Counts for Mar 19:', counts);
    console.log('Total for Mar 19:', allData.length);
}

main();
