import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = createAdminClient();

        // Fetch all users (profiles)
        // Limit to 5000 to prevent timeout/memory issues for now
        const { data: users, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at, status, total_commission, total_referrals")
            .order("created_at", { ascending: false })
            .limit(5000);

        if (error) {
            console.error("Export error:", error);
            return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ error: "No users found" }, { status: 404 });
        }

        // Generate CSV
        const headers = ["User ID", "Full Name", "Email", "Status", "Joined Date", "Commission", "Referrals"];
        const rows = users.map((user: any) => [
            user.id,
            `"${user.full_name || ''}"`, // Quote strings to handle commas
            user.email,
            user.status || 'active',
            new Date(user.created_at).toISOString().split('T')[0],
            user.total_commission || 0,
            user.total_referrals || 0
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Return CSV file
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error("Export API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
