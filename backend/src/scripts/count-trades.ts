import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTradesCount() {
    const { count, error } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching count:", error);
    } else {
        console.log(`Total rows in trades table: ${count}`);
    }
}

checkTradesCount();
