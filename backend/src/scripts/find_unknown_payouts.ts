import { supabase } from '../lib/supabase';

async function findUnknownPayouts() {
    console.log('--- Auditing Payout Requests for Missing Profiles ---');

    // 1. Fetch all payout requests
    const { data: requests, error: reqError } = await supabase
        .from('payout_requests')
        .select('id, user_id, amount, status, created_at')
        .order('created_at', { ascending: false });

    if (reqError) {
        console.error('Error fetching payout requests:', reqError.message);
        return;
    }

    if (!requests || requests.length === 0) {
        console.log('No payout requests found.');
        return;
    }

    const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))];
    console.log(`Auditing ${requests.length} requests from ${userIds.length} users...`);

    // 2. Fetch profiles for these users
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

    if (profError) {
        console.error('Error fetching profiles:', profError.message);
        return;
    }

    const profileIds = new Set(profiles?.map(p => p.id) || []);
    const unknownRequests = requests.filter(r => !profileIds.has(r.user_id));

    if (unknownRequests.length === 0) {
        console.log('✅ All payout requests have associated profiles.');
    } else {
        console.log(`❌ Found ${unknownRequests.length} requests with missing profiles:`);
        console.table(unknownRequests.map(r => ({
            id: r.id,
            user_id: r.user_id,
            amount: r.amount,
            status: r.status,
            created_at: r.created_at
        })));

        // Try to identify if these user_ids exist at all (might need service role for auth.users)
        // Since we are using SERVICE_ROLE_KEY usually in scripts, let's see.
    }
}

findUnknownPayouts();
