import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Return the payload for Trustpilot
        // Note: For Verified Review Collector, this usually needs to be encrypted or signed.
        // However, we follow the simple payload structure as per common In-App Review Collector requirements.
        return NextResponse.json({
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Customer",
            referenceId: `REF-${user.id.substring(0, 8)}-${Date.now()}`
        });
    } catch (error) {
        console.error("Error generating Trustpilot payload:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
