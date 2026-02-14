
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EXCEPT_ORDER_IDS = [
    'SF1771056865268A2TVR5D55',
    'SF177106032773920OGL9UZB',
    'SF1771059631193ZKLI3HMLF'
];

async function main() {
    console.log('🚀 Starting Comprehensive Clean for last 24 hours...');

    // 1. Calculate time 24 hours ago
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const timeString = yesterday.toISOString();
    console.log(`Checking records created after: ${timeString}`);

    // ==========================================
    // STEP 1: CLEANUP ORPHANED CHALLENGES
    // ==========================================
    console.log('\n--- PHASE 1: ORPHANED CHALLENGES ---');

    // Fetch all challenges in last 24h
    const { data: recentChallenges, error: challError } = await supabase
        .from('challenges')
        .select('id, metadata, created_at')
        .gt('created_at', timeString);

    if (challError) {
        console.error('Error fetching challenges:', challError);
    } else {
        const orphans = recentChallenges.filter(c => {
            // Check if this challenge is linked to an exception order
            // Metadata might contain parent_order_id or we might have to be smart
            const meta = c.metadata || {};
            const parentOrder = meta.parent_order_id; // For BOGO

            // Should strictly preserve anything linked to the EXCEPT orders
            // PROXY CHECK: Use the metadata we know.
            // But wait, the main orders also have challenges.
            // We shouldn't delete challenges if they BELONG to a valid payment order.

            // Let's check if there is a payment order for this challenge
            // This requires a separate query or list of valid challenge IDs.
            return true;
        });

        // Optimization: Get ALL valid payment orders first to whitelist challenges
        const { data: validOrders } = await supabase
            .from('payment_orders')
            .select('challenge_id')
            .in('order_id', EXCEPT_ORDER_IDS);

        const whiteListedChallengeIds = new Set(validOrders?.map(o => o.challenge_id) || []);

        // Also whitelist BOGO challenges if they are linked to these orders
        // (BOGO metadata usually has parent_order_id)

        // Filter orphans:
        // 1. Not in whitelisted IDs
        // 2. Not linked to whitelisted orders via metadata
        const toDeleteIds: string[] = [];

        for (const c of recentChallenges) {
            if (whiteListedChallengeIds.has(c.id)) continue;

            const meta = c.metadata || {};
            if (meta.parent_order_id && EXCEPT_ORDER_IDS.includes(meta.parent_order_id)) continue;

            // Also duplicate check: Does a payment order exist for this challenge?
            // Since we deleted the payment orders in the previous step, if a payment order exists, it MUST be one of the exceptions.
            // So if we query payment_orders for this challenge_id and find nothing, it's an orphan.

            // We can do this efficiently by fetching all payment_orders active
            // Actually, we already deleted the payment orders. So any challenge NOT in whitelist is likely an orphan.
            // BUT, to be safe, let's verify if ANY payment order relates to it.

            // Given the bulk delete of payment orders, challenges without a payment order (and not in whitelist) are targets.
            toDeleteIds.push(c.id);
        }

        if (toDeleteIds.length > 0) {
            console.log(`Found ${toDeleteIds.length} potential orphaned challenges.`);

            // Double check: ensure no remaining payment_orders link to these
            const { data: survivingLinks } = await supabase
                .from('payment_orders')
                .select('challenge_id')
                .in('challenge_id', toDeleteIds);

            const linkedIds = new Set(survivingLinks?.map(o => o.challenge_id));
            const finalDeleteIds = toDeleteIds.filter(id => !linkedIds.has(id));

            if (finalDeleteIds.length > 0) {
                console.log(`Deleting ${finalDeleteIds.length} verified orphans...`);
                // Chunk deletion if too many
                const { error: delErr } = await supabase.from('challenges').delete().in('id', finalDeleteIds);
                if (delErr) console.error('Challenge Delete Error:', delErr);
                else console.log('✅ Challenges Deleted.');
            } else {
                console.log('✅ No verified orphans found (all matched to surviving orders).');
            }
        } else {
            console.log('✅ No filtered challenges to delete.');
        }
    }


    // ==========================================
    // STEP 2: CLEANUP PAYOUTS
    // ==========================================
    console.log('\n--- PHASE 2: PAYOUTS ---');

    const { data: payouts, error: payoutFetchError } = await supabase
        .from('payout_requests')
        .select('id, created_at')
        .gt('created_at', timeString);

    if (payoutFetchError) {
        console.error('Error fetching payouts:', payoutFetchError);
    } else {
        const payoutIds = payouts?.map(p => p.id) || [];

        if (payoutIds.length > 0) {
            console.log(`Found ${payoutIds.length} payouts to delete.`);
            const { error: delPayoutErr } = await supabase
                .from('payout_requests')
                .delete()
                .in('id', payoutIds);

            if (delPayoutErr) console.error('Payout Delete Error:', delPayoutErr);
            else console.log('✅ Payouts Deleted.');
        } else {
            console.log('✅ No recent payouts found.');
        }
    }

    console.log('\n🎉 Comprehensive Cleanup Complete!');
}

main().catch(console.error);
