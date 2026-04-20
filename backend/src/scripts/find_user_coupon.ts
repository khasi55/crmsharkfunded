
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCoupon() {
    const email = 'yatharth0710@gmail.com';
    console.log(`Searching for coupon used by: ${email}`);

    // 1. Find user_id from profiles
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError.message);
    }

    const userId = profile?.id;
    if (userId) {
        console.log(`Found User ID: ${userId}`);
    } else {
        console.log("No profile found for this email. Checking payment_orders metadata...");
    }

    // 2. Search payment_orders
    let query = supabase.from('payment_orders').select('order_id, coupon_code, status, created_at, metadata');

    if (userId) {
        query = query.or(`user_id.eq.${userId},metadata->>customerEmail.eq.${email}`);
    } else {
        query = query.filter('metadata->>customerEmail', 'eq', email);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
        console.error("Error fetching orders:", ordersError.message);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log("No orders found for this email.");
    } else {
        console.log(`Found ${orders.length} orders:`);
        orders.forEach(order => {
            console.log(`- Order: ${order.order_id}, Status: ${order.status}, Coupon: ${order.coupon_code || 'None'}, Date: ${order.created_at}`);
        });
    }

    // 3. Search challenges
    console.log("\nSearching for challenges for this user...");
    if (userId) {
        const { data: challenges, error: challengesError } = await supabase
            .from('challenges')
            .select('id, login, challenge_type, status, created_at, metadata')
            .eq('user_id', userId);

        if (challengesError) {
            console.error("Error fetching challenges:", challengesError.message);
        } else if (challenges && challenges.length > 0) {
            console.log(`Found ${challenges.length} challenges:`);
            challenges.forEach(c => {
                const coupon = c.metadata?.coupon || c.metadata?.coupon_code || 'None';
                console.log(`- Challenge ID: ${c.id}, Login: ${c.login}, Type: ${c.challenge_type}, Status: ${c.status}, Coupon: ${coupon}, Date: ${c.created_at}`);
            });
        } else {
            console.log("No challenges found for this user.");
        }
    }
}

findCoupon();
