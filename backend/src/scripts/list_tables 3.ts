import { supabaseAdmin } from '../lib/supabase';

async function listTables() {
    const { data, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.error('Error listing tables:', error);
    } else {
        console.log('Tables in public schema:', data.map(t => t.table_name));
    }
}

listTables();
