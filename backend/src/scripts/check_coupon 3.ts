import { supabaseAdmin } from '../lib/supabase';

async function checkCoupon() {
    console.log('Checking for coupon SAHIB...');
    
    const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', 'SAHIB')
        .single();

    if (error) {
        console.error('Error finding coupon:', error.message);
    } else {
        console.log('Found coupon:', coupon);
    }
}

checkCoupon();
