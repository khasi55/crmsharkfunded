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

async function checkIssues() {

    // Attempt to search all users to find email regardless of auth.admin
    // The user might be in a different table, let's just grab recent payment orders and see if any metadata has the email.

    const { data: payments } = await supabase
        .from('payment_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    let found = false;
    if (payments) {
        payments.forEach(p => {
            const m = p.metadata;
            const mStr = JSON.stringify(m || {}).toLowerCase();
            if (mStr.includes('faizanmalik2032')) {
                console.log(`Found Payment ID: ${p.id}, Amount: ${p.amount}, Coupon: ${p.coupon_code || 'None'}, Status: ${p.status}, Date: ${p.created_at}`);
                console.log(`  Metadata: ${JSON.stringify(m)}`);
                found = true;
            }
        });
    }

    if (!found) {
        console.log("Could not find any recent payment for faizanmalik2032@gmail.com in metadata.");

        // Let's do a wider search on raw_user_meta_data via auth.admin but without filtering locally immediately
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (users) {
            const manualFind = users.filter(u => JSON.stringify(u).toLowerCase().includes('faizanmalik2032'));
            if (manualFind.length > 0) {
                console.log(`Found user manually in admin list:`);
                manualFind.forEach(u => {
                    console.log(`User ID: ${u.id}, Email: ${u.email}`);
                });

                // If found, fetch their payments
                for (const u of manualFind) {
                    const { data: userPayments } = await supabase.from('payment_orders').select('*').eq('user_id', u.id);
                    if (userPayments) {
                        userPayments.forEach(up => {
                            console.log(`  * User Payment ID: ${up.id}, Coupon: ${up.coupon_code || 'None'}, Amount: ${up.amount}`);
                        });
                    }
                }
            } else {
                console.log(`User absolutely not found in Supabase Auth.`);
            }
        }
    }

    // Check Risk Engine logs for 900909495021
    console.log(`\nChecking Risk Engine status logic for 900909495021...`);
    // The account has 0 trading days logged. 
    // Let's see if there is a minimum trading days requirement.
    const { data: challenge } = await supabase.from('challenges').select('*').eq('login', 900909495021).single();
    if (challenge) {
        // Let's see what challenge config it uses
        const { data: rules } = await supabase.from('challenge_tiers').select('*').eq('challenge_type', challenge.challenge_type);
        console.log(`Account uses rule set: ${challenge.challenge_type}`);
        if (rules && rules.length > 0) {
            console.log(`Min trading days: ${rules[0].min_trading_days}`);
        } else {
            // Let's check mt5_groups maybe? Or hardcoded in risk-engine?
            console.log("No challenge_tiers match.");
        }
    }
}

checkIssues();
