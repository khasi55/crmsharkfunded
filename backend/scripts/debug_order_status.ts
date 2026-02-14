
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const orderId = 'SF1771061948087KQY7AOXT6';
    console.log(`🔍 Checking Order ${orderId}...`);

    const { data: order, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error fetching order:', error);
        return;
    }

    console.log('Order Details:');
    console.log(`- Status: ${order.status}`);
    console.log(`- Amount: ${order.amount}`);
    console.log(`- User ID: ${order.user_id}`);
    console.log(`- Account Created: ${order.is_account_created}`);
    console.log(`- Metadata:`, JSON.stringify(order.metadata, null, 2));

    if (!order.user_id) {
        console.warn('⚠️ User ID is MISSING. This is likely why account was not created.');
        const email = order.metadata?.customerEmail || order.metadata?.email;
        if (email) {
            console.log(`   Attempting resolving from email: ${email}`);
            const { data: user } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
            if (user) console.log(`   ✅ Resolved User ID: ${user.id}`);
            else console.log(`   ❌ User profile still missing for ${email}`);
        }
    }
}

main().catch(console.error);
