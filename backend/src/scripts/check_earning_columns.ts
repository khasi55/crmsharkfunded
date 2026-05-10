import { supabaseAdmin } from '../lib/supabase';

async function checkEarningColumns() {
    const { data, error } = await supabaseAdmin
        .from('affiliate_earnings')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Columns in affiliate_earnings:', Object.keys(data[0] || {}));
    }
}

checkEarningColumns();
