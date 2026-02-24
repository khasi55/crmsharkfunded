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

async function findFaizan() {
    console.log("Searching for 'faizan' across all users...");
    const { data } = await supabase.auth.admin.listUsers();

    let targetUserId = null;

    if (data && data.users) {
        const matches = data.users.filter(u =>
            u.email?.toLowerCase().includes('faizan') ||
            JSON.stringify(u.user_metadata || {}).toLowerCase().includes('faizan')
        );

        if (matches.length > 0) {
            console.log(`Found ${matches.length} matching user(s)!`);
            matches.forEach(m => {
                console.log(`- ID: ${m.id} | Email: ${m.email} | Name: ${m.user_metadata?.full_name}`);
                if (m.email?.toLowerCase().includes('faizanmalik2032')) {
                    targetUserId = m.id;
                }
            });
            // If we found a match, check their payments
            for (const match of matches) {
                console.log(`\nChecking payments for ${match.email}...`);
                const { data: payments } = await supabase.from('payment_orders').select('*').eq('user_id', match.id);
                if (payments && payments.length > 0) {
                    payments.forEach(p => {
                        console.log(`   -> Payment ID: ${p.id} | Amount: ${p.amount} | Coupon: ${p.coupon_code || 'NONE'} | Status: ${p.status}`);
                    });
                } else {
                    console.log("   -> No payments found.");
                }
            }
        } else {
            console.log("No users found containing 'faizan' in email or metadata.");
        }
    }

    // Let's also do a raw query on payment_orders in case the user was deleted but order remains
    console.log("\nSearching payment_orders metadata for 'faizan'...");
    const { data: allPayments } = await supabase.from('payment_orders').select('id, amount, coupon_code, status, metadata, user_id');

    if (allPayments) {
        let foundPayments = allPayments.filter(p => JSON.stringify(p.metadata || {}).toLowerCase().includes('faizan'));
        if (foundPayments.length > 0) {
            console.log(`Found ${foundPayments.length} payments with 'faizan' in metadata:`);
            foundPayments.forEach(p => {
                console.log(`   -> Payment ID: ${p.id} | Coupon: ${p.coupon_code || 'NONE'} | UserID: ${p.user_id}`);
            });
        } else {
            console.log("No payments found containing 'faizan' in metadata.");
        }
    }
}

findFaizan();
