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
    return data || [];
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
