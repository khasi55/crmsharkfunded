import { supabaseAdmin } from '../lib/supabase';

async function checkAffiliatesTable() {
    console.log('Checking for affiliates table...');
    const { data, error } = await supabaseAdmin
        .from('affiliates')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Affiliates table error:', error.message);
    } else {
        console.log('Affiliates table exists. Samples:', data);
    }
}

checkAffiliatesTable();
