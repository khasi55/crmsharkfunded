import { supabase } from '../lib/supabase';
async function run() {
    const { data: user } = await supabase.from('profiles').select('id').eq('email', 'siddareddy1947@gmail.com').single();
    if (!user) return console.log('User not found');
    const { data: withdrawals } = await supabase.from('affiliate_withdrawals').select('*').eq('user_id', user.id);
    console.log('Withdrawals:', JSON.stringify(withdrawals, null, 2));
}
run();
