import { supabaseAdmin } from '../lib/supabase';

async function checkCurrentBalance() {
    const userId = 'ca4bfd6f-f298-4d46-98e2-236761fb3da6';
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('total_commission, wallet_balance')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Current profile:', profile);
    }
}

checkCurrentBalance();
