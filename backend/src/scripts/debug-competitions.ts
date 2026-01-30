
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // Expects .env in current directory (backend/)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCompetitions() {
    console.log("Fetching all competitions from DB...");
    const { data, error } = await supabase
        .from('competitions')
        .select('id, title, status, created_at');

    if (error) {
        console.error("Error fetching competitions:", error);
    } else {
        console.table(data);
        console.log(`Total competitions found: ${data?.length}`);
    }
}

listCompetitions();
