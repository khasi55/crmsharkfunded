"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function getAffiliateSales(page: number, limit: number, query?: string) {
    const supabase = createAdminClient();
    const from = page * limit;
    const to = from + limit - 1;

    let queryBuilder = supabase
        .from('affiliate_earnings')
        .select(`
            id,
            amount,
            status,
            created_at,
            order_id,
            referrer:profiles!referrer_id(full_name, email),
            referred:profiles!referred_user_id(full_name, email),
            metadata
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (query) {
        // Search by order ID or affiliate name/email if possible
        // Note: Cross-table search in Supabase is limited in the JS client without RPC.
        // We'll prioritize order_id search here.
        queryBuilder = queryBuilder.or(`order_id.ilike.%${query}%,status.ilike.%${query}%`);
    }

    const { data, count, error } = await queryBuilder;

    if (error) {
        console.error("Error fetching affiliate sales:", error);
        throw new Error("Failed to fetch affiliate sales");
    }

    return {
        sales: data || [],
        total: count || 0
    };
}

export async function getAffiliateWithdrawals() {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('affiliate_withdrawals')
        .select(`
            *,
            profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching affiliate withdrawals:", error);
        throw new Error("Failed to fetch affiliate withdrawals");
    }
    return data || [];
}

export async function getAffiliateTree(page: number, limit: number, search?: string) {
    const supabase = createAdminClient();
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('profiles')
        .select('id, full_name, email, referral_code', { count: 'exact' })
        .not('referral_code', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) {
        console.error("Error fetching affiliate tree:", error);
        throw new Error("Failed to fetch affiliate tree");
    }

    const enrichedData = await Promise.all((data || []).map(async (aff: any) => {
        const { count: referredCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', aff.id);

        const { data: earnings } = await supabase
            .from('affiliate_earnings')
            .select('amount')
            .eq('referrer_id', aff.id);

        const salesVolume = earnings?.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
        const salesCount = earnings?.length || 0;

        return {
            ...aff,
            referred_count: referredCount || 0,
            sales_volume: salesVolume,
            sales_count: salesCount,
            referred_users: []
        };
    }));

    return {
        tree: enrichedData,
        total: count || 0
    };
}

export async function getAffiliateReferrals(affiliateId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            created_at,
            metadata
        `)
        .eq('referred_by', affiliateId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching affiliate referrals:", error);
        throw new Error("Failed to fetch affiliate referrals");
    }

    const enriched = await Promise.all((data || []).map(async (user: any) => {
        const { count: accountCount } = await supabase
            .from('challenges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        const { data: sales } = await supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('referred_user_id', user.id)
            .eq('referrer_id', affiliateId);

        return {
            ...user,
            account_count: accountCount || 0,
            coupon_used: (user as any).metadata?.coupon_used || null,
            sales_details: sales?.map((s: any) => ({
                order_id: s.order_id,
                amount: s.amount,
                currency: 'USD',
                created_at: s.created_at
            })) || [],
            accounts: []
        };
    }));

    return enriched;
}

export async function getAffiliateUserAccounts(userId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('challenges')
        .select('id, login, status, challenge_type, initial_balance, current_equity')
        .eq('user_id', userId);

    if (error) {
        console.error("Error fetching affiliate user accounts:", error);
        throw new Error("Failed to fetch affiliate user accounts");
    }

    return data?.map((acc: any) => ({
        ...acc,
        plan_type: acc.challenge_type
    })) || [];
}
