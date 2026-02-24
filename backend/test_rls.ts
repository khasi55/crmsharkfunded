
import { supabase } from './src/lib/supabase';

async function testRLS() {
    console.log("🔍 Testing Supabase RLS for 'challenges' table...");

    // Try a dummy insert that should fail if RLS is blocking but pass with Service Role
    const dummyChallenge = {
        user_id: '04a05ed2-1e1d-45aa-86d2-d0572501e7ed', // Using an existing user ID from previous logs
        initial_balance: 5000,
        current_balance: 5000,
        current_equity: 5000,
        start_of_day_equity: 5000,
        login: 123456789,
        status: 'active',
        challenge_type: 'test_rls_dummy',
        group: 'test_group'
    };

    console.log("Attempting to insert dummy challenge...");
    const { data, error } = await supabase
        .from('challenges')
        .insert(dummyChallenge)
        .select();

    if (error) {
        console.error("❌ Insert FAILED:", JSON.stringify(error, null, 2));
    } else {
        console.log("✅ Insert SUCCESSFUL:", data);

        // Clean up
        const { error: deleteError } = await supabase
            .from('challenges')
            .delete()
            .eq('login', 123456789);

        if (deleteError) {
            console.error("⚠️ Cleanup FAILED:", deleteError);
        } else {
            console.log("🧹 Cleanup successful.");
        }
    }
}

testRLS();
