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

    // Check admin permission (simplified for now, ideally strictly checked)
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) throw new Error("Unauthorized");

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
    // return { success: true };
}

export async function updatePayoutStatus(
    requestId: string,
    status: "approved" | "rejected",
    reason?: string,
    transactionId?: string
) {
    const supabase = await createClient();

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
