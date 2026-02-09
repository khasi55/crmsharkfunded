import { supabase } from '../lib/supabase';

async function diagnose() {
    const orderIds = [
        'SFORD1770570351030d1f0953b',
        'SFORD1770564410820d8c6ea6c',
        'SFORD17705630138441bad4a71',
        'SFORD1770560651199e951d35c',
        'SFORD17705589356859c5ef744'
    ];

    console.log('🔍 Fetching specific payment orders...');
    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .in('order_id', orderIds);

    if (error) {
        console.error('❌ Error fetching payments:', error);
        return;
    }

    console.log('✅ Found', data?.length, 'results');
    data?.forEach(p => {
        console.log(`\nOrder: ${p.order_id}`);
        console.log(`- payment_gateway: ${p.payment_gateway}`);
        console.log(`- payment_method: ${p.payment_method}`);
        console.log(`- account_size: ${p.account_size} (Type: ${typeof p.account_size})`);
        console.log(`- coupon_code: ${p.coupon_code}`);
        console.log(`- user_id: ${p.user_id}`);
    });
}

diagnose();
