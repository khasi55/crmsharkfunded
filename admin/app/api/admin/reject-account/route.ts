import { createAdminClient } from "@/utils/supabase/admin";
import { fetchWithAuth } from "@/utils/fetch-with-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { accountId, reason, comment } = await request.json();

        if (!accountId) {
            return NextResponse.json(
                { message: "Account ID is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Fetch the current account to verify it exists
        const { data: account, error: fetchError } = await supabase
            .from("challenges")
            .select("*")
            .eq("id", accountId)
            .single();

        if (fetchError || !account) {
            return NextResponse.json(
                { message: "Account not found" },
                { status: 404 }
            );
        }

        // Call backend to handle the reject
        const response = await fetchWithAuth(`/api/admin/reject-account`, {
            method: 'POST',
            body: JSON.stringify({ accountId, reason, comment }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Backend reject action failed' }));
            throw new Error(errorData.error || 'Backend reject action failed');
        }

        return NextResponse.json({
            message: "Account upgrade rejected successfully!",
        });

    } catch (error: any) {
        console.error("Reject action error:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
