import { supabase } from '../lib/supabase';

async function checkAccountTypes() {
    const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .ilike('name', '%prime%')
        .ilike('name', '%instant%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('ACCOUNT_TYPES:', JSON.stringify(data, null, 2));
}

checkAccountTypes();
