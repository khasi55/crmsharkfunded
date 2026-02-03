
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('🕵️‍♀️ Diagnosing Affiliate Issue...\n');

    // 1. Check Schema (Can we write to the new columns?)
    try {
        console.log('1️⃣ Checking Schema Compatibility...');
        // Try to select the new columns from a dummy query or recent record
        const { data, error } = await supabase
            .from('affiliate_earnings')
            .select('commission_type, status, metadata')
            .limit(1);

        if (error) {
            console.error('   ❌ Schema Error: Could not select new columns. The migration likely wasn\'t applied.');
            console.error('      Error:', error.message);
        } else {
            console.log('   ✅ Schema looks correct (columns exist).');
        }
    } catch (err: any) {
        console.error('   ❌ Unexpected Schema Check Error:', err.message);
    }

    // 2. Check Recent Orders
    console.log('\n2️⃣ Checking Recent Orders...');
    const { data: orders } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(3);

    if (orders) {
        for (const order of orders) {
            const { data: profile } = await supabase.from('profiles').select('full_name, referred_by').eq('id', order.user_id).single();
            const referred = profile?.referred_by ? 'YES' : 'NO';
            console.log(`   🛒 Order ${order.order_id} | User: ${profile?.full_name} | Referred: ${referred}`);

            if (profile?.referred_by) {
                const { data: earns } = await supabase.from('affiliate_earnings').select('*').eq('referred_user_id', order.user_id);
                if (earns && earns.length > 0) {
                    const match = earns.find(e => {
                        // Loose match
                        return Math.abs(new Date(e.created_at).getTime() - new Date(order.created_at).getTime()) < 3600000;
                    });
                    if (match) console.log(`      ✅ Commission Found: $${match.amount}`);
                    else console.log(`      ❌ No Matching Commission Found (Earnings exist but time mismatch)`);
                } else {
                    console.log(`      ❌ NO COMMISSION FOUND.`);
                }
            }
        }
    }
}

diagnose();
