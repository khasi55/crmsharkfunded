const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://qjshgyxbhjhpqaprfeob.supabase.co', 'sb_secret_laJUGdDTOKGr49iaTQN0CQ_CUHfuc5i');

async function testFetch() {
    console.log('Starting fetch...');
    const { data, error } = await supabase.from('payment_orders').select('amount, user_id, payment_gateway, created_at').eq('status', 'paid').limit(10);
    if (error) console.error('Error:', error);
    else console.log('Successfully fetched', data.length, 'rows');
}

testFetch();
