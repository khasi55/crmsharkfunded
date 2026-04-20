import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestOrders() {
    console.log('--- Deleting Automated Test Orders ---');
    
    try {
        // 1. Find all orders starting with TEST_SECURE_
        const { data: testOrders, error: findError } = await supabase
            .from('payment_orders')
            .select('order_id, id')
            .like('order_id', 'TEST_SECURE_%');

        if (findError) {
            console.error('Error finding test orders:', findError);
            return;
        }

        if (!testOrders || testOrders.length === 0) {
            console.log('No test orders found to delete.');
            return;
        }

        console.log(`Found ${testOrders.length} test orders. Deleting...`);

        // 2. Delete from payment_orders
        const { error: deleteError } = await supabase
            .from('payment_orders')
            .delete()
            .like('order_id', 'TEST_SECURE_%');

        if (deleteError) {
            console.error('Error deleting test orders:', deleteError);
        } else {
            console.log('✅ Successfully deleted all TEST_SECURE_ orders.');
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

deleteTestOrders();
