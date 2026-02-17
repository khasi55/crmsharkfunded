import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditStatuses() {
    console.log('📊 Auditing Account Statuses in "challenges" table...\n');

    const { data, error } = await supabase
        .from('challenges')
        .select('status');

    if (error) {
        console.error('Error fetching statuses:', error.message);
        return;
    }

    const counts: Record<string, number> = {};
    data.forEach(row => {
        const s = row.status || 'null';
        counts[s] = (counts[s] || 0) + 1;
    });

    console.log('Overall Status Counts:');
    Object.entries(counts).forEach(([status, count]) => {
        console.log(`- ${status}: ${count}`);
    });

    // Check for recent breached/disabled
    const { data: recent } = await supabase
        .from('challenges')
        .select('login, status, updated_at')
        .in('status', ['breached', 'disabled'])
        .order('updated_at', { ascending: false })
        .limit(5);

    if (recent && recent.length > 0) {
        console.log('\nLast 5 Breached/Disabled Accounts:');
        recent.forEach(r => console.log(`- [${r.login}] ${r.status} (Updated: ${r.updated_at})`));
    }
}

auditStatuses();
