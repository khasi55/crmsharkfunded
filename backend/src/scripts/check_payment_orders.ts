import { supabaseAdmin } from '../lib/supabase';

async function checkPaymentOrders() {
    const userId = 'ca4bfd6f-f298-4d46-98e2-236761fb3da6'; // SahibNoor Singh
    
    console.log('Checking payment_orders for user...');
    const { data: orders, error } = await supabaseAdmin
        .from('payment_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('payment_orders table error:', error.message);
    } else {
        console.log('Payment orders:', orders);
    }

    // Also check for discount_coupons with code SAHIB
    console.log('Checking discount_coupons for SAHIB...');
    const { data: coupons, error: cError } = await supabaseAdmin
        .from('discount_coupons')
        .select('*')
        .eq('code', 'SAHIB');
    
    if (cError) {
        console.error('discount_coupons table error:', cError.message);
    } else {
        console.log('Discount coupons found:', coupons);
    }
}

checkPaymentOrders();
