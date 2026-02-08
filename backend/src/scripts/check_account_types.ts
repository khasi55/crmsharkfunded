
import { supabase } from '../lib/supabase';

async function checkAccountTypes() {
    console.log('--- Account Types ---');
    const { data: accountTypes } = await supabase.from('account_types').select('*');
    console.table(accountTypes?.map(at => ({
        id: at.id,
        name: at.name,
        group: at.mt5_group_name,
        leverage: at.leverage
    })));
}

checkAccountTypes();
