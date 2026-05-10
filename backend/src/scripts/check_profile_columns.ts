import { supabaseAdmin } from '../lib/supabase';

async function checkProfileColumns() {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Columns in profiles:', Object.keys(data[0] || {}));
    }
}

checkProfileColumns();
