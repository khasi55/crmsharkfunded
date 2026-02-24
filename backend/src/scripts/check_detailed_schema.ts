
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetailedSchema() {
    console.log('Checking detailed schema for payment_orders via RPC or direct query...');

    // Attempting to get column info via a query that returns metadata if possible
    // Since we don't have information_schema access easily, we use a trick:
    // Insert an empty object and see the error message which often lists missing columns/constraints.

    console.log('\n--- Test: Empty Insert (to see required columns) ---');
    const { error: emptyError } = await supabase.from('payment_orders').insert({});
    if (emptyError) {
        console.log('Error from empty insert:', emptyError.message);
        console.log('Details:', emptyError.details);
    }

    console.log('\n--- Test: Partial Insert (Missing account_size) ---');
    const { error: partialError } = await supabase.from('payment_orders').insert({
        order_id: 'TEST-' + Date.now(),
        amount: 10,
        currency: 'USD',
        status: 'pending'
    });
    if (partialError) {
        console.log('Error from partial insert:', partialError.message);
    } else {
        console.log('Partial insert (missing most fields) worked!');
    }

    console.log('\n--- Checking existing data columns ---');
    const { data, error } = await supabase.from('payment_orders').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns in payment_orders:', Object.keys(data[0]));
        console.log('Sample data:', data[0]);
    } else {
        console.log('No data in payment_orders to check columns.');
    }
}

checkDetailedSchema();
