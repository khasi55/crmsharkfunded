import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkIndexes() {
    const { data, error } = await supabase.rpc('get_table_indexes', { table_name: 'trades' });
    
    if (error) {
        // Fallback: we might not have a get_table_indexes RPC.
        // Let's just try to insert a dummy query and see explain plan? Or make an RPC.
        console.error("RPC failed, trying raw query via pg_indexes...", error.message);
        
        // This won't work without an RPC since standard Supabase API doesn't allow raw SQL queries without RPCs.
    } else {
        console.log("Indexes:", data);
    }
}
checkIndexes();
