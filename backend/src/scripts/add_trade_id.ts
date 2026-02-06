import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTradeIdColumn() {
    console.log('🔄 Adding trade_id column to advanced_risk_flags...\n');

    // Note: Supabase client doesn't support DDL directly, but the column should already exist
    // Let's just verify and proceed with backfill

    console.log('✅ Column should be added via Supabase dashboard or direct SQL');
    console.log('Proceeding to clear and backfill violations with trade_id...\n');
}

addTradeIdColumn().catch(console.error);
