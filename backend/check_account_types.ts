
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccountTypes() {
    console.log('Checking account_types table...');
    const { data, error } = await supabase
        .from('account_types')
        .select('*');

    if (error) {
        console.error('Error fetching account_types:', error);
        return;
    }

    console.table(data.map(at => ({
        id: at.id,
        name: at.name,
        mt5_group: at.mt5_group_name
    })));
}

checkAccountTypes();
