import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Querying database tables...');
    
    // Attempt to query risk_events or similar tables
    const tablesToCheck = ['core_risk_violations', 'advanced_risk_flags', 'account_events', 'risk_events', 'events'];
    
    for (const table of tablesToCheck) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table} might not exist or error: ${error.message}`);
        } else {
            console.log(`✅ Table ${table} exists! Columns: ${Object.keys(data[0] || {}).join(', ')}`);
        }
    }
}

main().catch(console.error);
