import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoupons() {
    const email = 'faizanmalik2032@gmail.com';
    console.log(`Checking payments table directly for email containing: ${email.split('@')[0]}...\n`);

    const { data: payments, error: pError } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, coupon_code, user_email')
        .ilike('user_email', `%${email.split('@')[0]}%`)
        .order('created_at', { ascending: false });

    if (pError) {
        console.error('Error fetching payments:', pError);
    } else if (payments && payments.length > 0) {
        console.log(`Found ${payments.length} payments for similar emails:`);
        payments.forEach(p => {
            console.log(`  - Email: ${p.user_email} | Coupon: ${p.coupon_code || 'NONE'} | Date: ${p.created_at} | Status: ${p.status} | Amount: ${p.amount}`);
        });
    } else {
        console.log('No payments found for any similar email.');
    }
}

checkCoupons();
