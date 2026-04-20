import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeAccounts() {
    const oldEmail = 'kunthuwealth3004@gmail.com'; // 1/18/2026
    const newEmail = 'Kunthuwealth3004@gmail.com'; // 3/3/2026 (ID: 35ac13a4-fc0d-4e53-9efe-60474bbc370f)

    console.log(`Checking accounts...`);

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .in('email', [oldEmail, newEmail]);

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log("Found profiles:");
    console.log(profiles);

    if (profiles.length !== 2) {
        console.log(`Expected 2 profiles, found ${profiles.length}. Aborting.`);
        return;
    }

    const oldProfile = profiles.find(p => p.email === oldEmail);
    const newProfile = profiles.find(p => p.email === newEmail);

    if (!oldProfile || !newProfile) {
        console.log("Could not identify exactly which is old and new. Aborting.");
        return;
    }

    console.log(`\nWill merge data from:`);
    console.log(`OLD: ${oldProfile.id} (${oldProfile.email})`);
    console.log(`NEW: ${newProfile.id} (${newProfile.email})`);

    // 1. Move challenges
    console.log(`\nMoving challenges...`);
    const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .update({ user_id: newProfile.id })
        .eq('user_id', oldProfile.id)
        .select('id, login');

    if (challengesError) console.error("Error moving challenges:", challengesError);
    else console.log(`Moved ${challenges?.length || 0} challenges.`);

    // 2. Move payment orders
    console.log(`\nMoving payment orders...`);
    const { data: orders, error: ordersError } = await supabase
        .from('payment_orders')
        .update({ user_id: newProfile.id })
        .eq('user_id', oldProfile.id)
        .select('order_id');

    if (ordersError) console.error("Error moving orders:", ordersError);
    else console.log(`Moved ${orders?.length || 0} orders.`);

    // 3. Optional: Move other data if needed (payouts, kyc, etc.)
    // We'll just do the main ones for now.

    console.log(`\nData moved successfully. You can now safely delete the old profile/auth user, or we can do it here.`);

    // Optional: delete old profile (this might fail if there are still foreign keys we missed)
    /*
    const { error: deleteError } = await supabase.auth.admin.deleteUser(oldProfile.id);
    if (deleteError) {
        console.error("Could not delete old auth user:", deleteError);
    } else {
        console.log("Deleted old auth user successfully.");
    }
    */
}

mergeAccounts();
