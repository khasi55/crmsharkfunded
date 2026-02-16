"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/utils/get-admin-user";

export async function updateKYCStatus(
    requestId: string,
    status: "approved" | "rejected",
    reason?: string
) {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();

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

    console.log(`🛡️ [Audit] ${user.email} updated KYC ${requestId} to ${status}`);

    revalidatePath("/kyc");
    revalidatePath(`/kyc/${requestId}`);
}

export async function updatePayoutStatus(
    requestId: string,
    status: "approved" | "rejected",
    reason?: string,
    transactionId?: string
) {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

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

    console.log(`🛡️ [Audit] ${user.email} updated Payout ${requestId} to ${status}`);

    revalidatePath("/payouts");
    revalidatePath(`/payouts/${requestId}`);
}
