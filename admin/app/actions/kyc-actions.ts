"use server";

import { fetchWithAuth } from "@/utils/fetch-with-auth";
import { revalidatePath } from "next/cache";

/**
 * Search users for manual KYC selection
 */
export async function searchUsersAction(query: string) {
    if (!query || query.length < 2) return { users: [] };

    try {
        const response = await fetchWithAuth(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to search users");
        }

        return await response.json();
    } catch (error: any) {
        console.error("❌ KYC Search Users Action Failed:", error);
        return { error: error.message || "Failed to search users", users: [] };
    }
}

/**
 * Create a manual KYC entry for a user
 */
export async function createManualKYCAction(data: any) {
    try {
        const response = await fetchWithAuth("/api/kyc/admin/create-manual", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create manual KYC");
        }

        const result = await response.json();
        
        // Revalidate the KYC list page
        revalidatePath("/kyc");
        
        return { success: true, data: result };
    } catch (error: any) {
        console.error("❌ Create Manual KYC Action Failed:", error);
        return { error: error.message || "Failed to create manual KYC" };
    }
}
