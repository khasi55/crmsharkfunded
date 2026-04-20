import { supabase } from '../lib/supabase';

async function checkRules() {
    const { data: rules, error } = await supabase
        .from('challenge_type_rules')
        .select('*');

    if (error) {
        console.error('Error fetching rules:', error.message);
        return;
    }

    console.log('--- Challenge Type Rules ---');
    console.table(rules);
}

checkRules();
