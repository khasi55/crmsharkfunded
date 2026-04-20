import { supabase } from '../lib/supabase';

async function simulateAdminPayouts() {
    console.log('--- Simulating Admin Payouts Route Logic ---');

    // 1. Fetch all payout requests
    const { data: requests, error } = await supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching admin payouts:', error);
        return;
    }

    console.log(`Fetched ${requests?.length} requests.`);

    // 2. Manual fetch for profiles (EXACT SAME LOGIC AS ROUTE)
    let profilesMap: Record<string, any> = {};
    if (requests && requests.length > 0) {
        const userIds = [...new Set(requests.map((r: any) => r.user_id).filter(Boolean))];
        console.log(`Unique userIds (${userIds.length}):`, userIds);

        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        if (profError) {
            console.error('Error fetching profiles:', profError);
        }

        console.log(`Fetched ${profiles?.length} profiles.`);

        profiles?.forEach((p: any) => {
            profilesMap[p.id] = p;
        });
    }

    // 3. Map profiles
    const mapped = requests?.map(r => ({
        id: r.id,
        user_id: r.user_id,
        profile: profilesMap[r.user_id] || 'MISSING'
    }));

    console.table(mapped);
}

simulateAdminPayouts();
