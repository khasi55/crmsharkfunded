import { supabaseAdmin } from '../lib/supabase';

async function checkExistingEarnings() {
    const userId = 'ca4bfd6f-f298-4d46-98e2-236761fb3da6';
    
    console.log('Checking for existing earnings for user...');
    const { data, error } = await supabaseAdmin
        .from('affiliate_earnings')
        .select('*')
        .eq('referrer_id', userId);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Existing earnings:', data);
    }
}

checkExistingEarnings();
