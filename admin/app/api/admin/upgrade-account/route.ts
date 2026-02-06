import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { accountId } = await request.json();

        if (!accountId) {
            return NextResponse.json(
                { message: "Account ID is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Fetch the current account to verify it exists and is passed
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

        // Check if account is in "passed" or "active" status
        if (account.status !== "passed" && account.status !== "active") {
            return NextResponse.json(
                { message: "Account must be in passed or active status to upgrade" },
                { status: 400 }
            );
        }

        // Call backend to handle the entire upgrade process
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';
        const upgradeResponse = await fetch(`${BACKEND_URL}/api/admin/upgrade-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountId }), // Pass the PASSED account ID
        });

        if (!upgradeResponse.ok) {
            const errorData = await upgradeResponse.json().catch(() => ({ error: 'Backend upgrade failed' }));
            throw new Error(errorData.error || 'Backend upgrade failed');
        }

        const result = await upgradeResponse.json();

        return NextResponse.json({
            message: "Account upgraded successfully!",
            newAccount: result.newAccount,
            oldAccountId: accountId
        });

    } catch (error: any) {
        console.error("Upgrade error:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
