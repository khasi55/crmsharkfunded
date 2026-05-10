import { supabaseAdmin } from '../lib/supabase';

async function checkTables() {
    const userId = 'ca4bfd6f-f298-4d46-98e2-236761fb3da6'; // SahibNoor Singh
    
    console.log('Checking transactions...');
    const { data: transactions, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId);
    
    if (txError) console.error('Transactions table error:', txError.message);
    else console.log('Transactions:', transactions);

    console.log('Checking challenges...');
    const { data: challenges, error: chError } = await supabaseAdmin
        .from('challenges')
        .select('*')
        .eq('user_id', userId);
    
    if (chError) console.error('Challenges table error:', chError.message);
    else console.log('Challenges:', challenges);

    console.log('Checking affiliate_earnings...');
    const { data: earnings, error: earnError } = await supabaseAdmin
        .from('affiliate_earnings')
        .select('*')
        .eq('referred_user_id', userId);
    
    if (earnError) console.error('Affiliate earnings table error:', earnError.message);
    else console.log('Affiliate earnings (as referred user):', earnings);
}

checkTables();
