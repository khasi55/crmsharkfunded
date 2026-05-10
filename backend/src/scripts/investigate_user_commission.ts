import { supabaseAdmin } from '../lib/supabase';

async function checkUser() {
    const email = 'thisissahibnoor@gmail.com';
    console.log(`Checking user: ${email}`);

    // Try finding by email
    const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (userError) {
        console.error('User not found by email:', userError.message);
        
        // Search by full_name 'SAHIB'
        const { data: usersByName, error: nameError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .ilike('full_name', '%SAHIB%');
        
        if (usersByName && usersByName.length > 0) {
            console.log(`Found ${usersByName.length} users with name SAHIB:`, usersByName.map(u => ({ id: u.id, email: u.email, name: u.full_name })));
        } else {
            console.log('No users found with name SAHIB');
        }
        return;
    }

    console.log('Found user:', {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        referred_by: user.referred_by
    });

    if (user.referred_by) {
        const { data: referrer, error: referrerError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', user.referred_by)
            .single();
        
        if (referrerError) {
            console.error('Referrer not found:', referrerError.message);
        } else {
            console.log('Referrer:', referrer);
        }
    } else {
        console.log('User has no referrer.');
    }

    // Also check for recent orders
    const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError.message);
    } else {
        console.log('Recent orders:', orders);
    }
}

checkUser();
