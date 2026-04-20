import { supabase } from '../lib/supabase';

async function testSearch() {
    const search = 'harshitkadela6@gmail.com';
    console.log(`Testing search for: "${search}"`);

    // 1. Try profile match first
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    
    console.log('Matched Profiles:', profiles);

    // 2. Try the full OR filter on payment_orders
    const matchedUserIds = profiles?.map(p => p.id) || [];
    let orFilter = `order_id.ilike.%${search}%,payment_id.ilike.%${search}%,metadata->>customerName.ilike.%${search}%,metadata->>customerEmail.ilike.%${search}%,metadata->>payer_name.ilike.%${search}%,metadata->>payer_email.ilike.%${search}%`;
            
    if (matchedUserIds.length > 0) {
        orFilter += `,user_id.in.(${matchedUserIds.join(',')})`;
    }

    console.log('OR Filter:', orFilter);

    const { data: payments, count, error } = await supabase
        .from('payment_orders')
        .select('*', { count: 'exact' })
        .or(orFilter)
        .limit(5);

    if (error) {
        console.error('Query Error:', error);
    } else {
        console.log('Total Count:', count);
        console.log('Results:', JSON.stringify(payments, null, 2));
    }
}

testSearch();
