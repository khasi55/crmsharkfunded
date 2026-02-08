
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

    console.log('\n--- Recent Challenges ---');
    const { data: challenges } = await supabase
        .from('challenges')
        .select('id, login, challenge_type, group, status')
        .order('created_at', { ascending: false })
        .limit(5);
    console.table(challenges);
}

checkAccountTypes();
