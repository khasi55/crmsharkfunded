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

async function listColumns() {
    console.log('🔍 Listing columns in "challenges" table...\n');

    const { data: oneRow, error } = await supabase
        .from('challenges')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching from challenges:', error.message);
        return;
    }

    if (oneRow && oneRow.length > 0) {
        const columns = Object.keys(oneRow[0]);
        console.log('Columns found:', columns.join(', '));

        const required = ['breached_at', 'upgraded_at', 'upgraded_to', 'last_upgrade_at'];
        required.forEach(col => {
            if (columns.includes(col)) {
                console.log(`✅ Column "${col}" EXISTS.`);
            } else {
                console.log(`❌ Column "${col}" MISSING.`);
            }
        });
    } else {
        console.log('No data found in challenges to inspect columns.');
    }
}

listColumns();
