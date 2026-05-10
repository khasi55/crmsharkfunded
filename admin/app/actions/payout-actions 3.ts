"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export async function getPayoutRequests(status?: string) {
    const supabase = createAdminClient();
    let query = supabase
        .from('payout_requests')
        .select(`
            *,
            profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching payout requests:", error);
        throw new Error("Failed to fetch payout requests");
    }

    // Fetch account details for each payout
    const requestsWithAccount = await Promise.all((data || []).map(async (req: any) => {
        let accountInfo = null;
        let challengeId = req.metadata?.challenge_id;

        // Handle metadata as string edge case
        if (typeof req.metadata === 'string') {
            try {
                const parsed = JSON.parse(req.metadata);
                challengeId = parsed.challenge_id;
            } catch (e) { }
        }

        if (challengeId) {
            const { data: challenge } = await supabase
                .from('challenges')
                .select('login, investor_password, current_equity, current_balance, challenge_type')
                .eq('id', challengeId)
                .maybeSingle();

            if (challenge) {
                accountInfo = {
                    login: challenge.login,
                    investor_password: challenge.investor_password,
                    equity: challenge.current_equity,
                    balance: challenge.current_balance,
                    account_type: challenge.challenge_type
                };
            }
        }

        return {
            ...req,
            account_info: accountInfo
        };
    }));

    return requestsWithAccount || [];
}

export async function getWalletAddresses() {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('wallet_addresses')
        .select(`
            *,
            profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching wallet addresses:", error);
        throw new Error("Failed to fetch wallet addresses");
    }
    return data || [];
}

export async function getBankDetails() {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('bank_details')
        .select(`
            *,
            profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching bank details:", error);
        throw new Error("Failed to fetch bank details");
    }
    return data || [];
}
