"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateKYCStatus(
    requestId: string,
    status: "approved" | "rejected",
    reason?: string
) {
    const supabase = await createClient();

    // 🛡️ SECURITY FIX: Enforce Authorization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: Please log in as an administrator.");

    // Check if user is an admin (using public.admin_users check or role)
    const { data: admin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!admin) {
        console.error(`🛑 Unauthorized attempt to update KYC status by ${user.email}`);
        throw new Error("Forbidden: Admin access required.");
    }

    const { error } = await supabase
        .from("kyc_requests")
        .update({
            status,
            rejection_reason: reason || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        console.error("Error updating KYC status:", error);
        throw new Error("Failed to update status");
    }

    revalidatePath("/admin/kyc");
    revalidatePath(`/admin/kyc/${requestId}`);
}

export async function updatePayoutStatus(
    requestId: string,
    status: "approved" | "rejected",
    reason?: string,
    transactionId?: string
) {
    const supabase = await createClient();

    // 🛡️ SECURITY FIX: Enforce Authorization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: Please log in as an administrator.");

    // Check if user is an admin
    const { data: admin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!admin) {
        console.error(`🛑 Unauthorized attempt to update Payout status by ${user.email}`);
        throw new Error("Forbidden: Admin access required.");
    }

    const { error } = await supabase
        .from("payout_requests")
        .update({
            status,
            rejection_reason: reason || null,
            transaction_id: transactionId || null,
            processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        console.error("Error updating Payout status:", error);
        throw new Error("Failed to update status");
    }

    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/payouts/${requestId}`);
}
