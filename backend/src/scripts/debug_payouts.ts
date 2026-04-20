import { supabase } from '../lib/supabase';

const challengeIds = ['2a27b779-e3ac-4e22-bcf2-fbf534f2bf6a', '6c74d86f-7f19-4736-8876-729769973565'];

async function debugPayouts() {
    console.log('--- Debugging Specific Payout Requests ---');

    for (const challengeId of challengeIds) {
        console.log(`\n🔍 Checking Payouts for Challenge ID: ${challengeId}`);
        
        // Find payout requests where metadata->challenge_id is this ID
        // Note: metadata is jsonb
        const { data: requests, error } = await supabase
            .from('payout_requests')
            .select('*')
            .filter('metadata->>challenge_id', 'eq', challengeId);

        if (error) {
            console.error(`Error fetching payouts:`, error.message);
            continue;
        }

        if (!requests || requests.length === 0) {
            console.log(`❌ No payout requests found for challenge ${challengeId}`);
            continue;
        }

        console.log(`✅ Found ${requests.length} payout requests.`);
        requests.forEach(r => {
            console.log(`   - Payout ID: ${r.id}, User ID: ${r.user_id}, Amount: ${r.amount}`);
        });

        // Check if user_id from payout matches challenge user_id
        const { data: challenge } = await supabase
            .from('challenges')
            .select('user_id')
            .eq('id', challengeId)
            .single();
        
        console.log(`   - Challenge User ID: ${challenge?.user_id}`);
    }
}

debugPayouts();
