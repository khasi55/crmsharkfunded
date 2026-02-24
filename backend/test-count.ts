import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
);

async function checkCounts() {
    const { count: total } = await supabase.from('challenges').select('*', { count: 'exact', head: true });
    console.log('Total challenges in DB:', total);
}

checkCounts();
