import { supabase } from '../lib/supabase';

async function checkColumns() {
    console.log('--- Checking payout_requests columns ---');
    const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .limit(1);
    
    if (data && data[0]) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data found to check columns.');
    }
}

checkColumns();
