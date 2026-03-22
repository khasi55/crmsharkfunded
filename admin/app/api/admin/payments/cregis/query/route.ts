import { fetchWithAuth } from "@/utils/fetch-with-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json(
                { message: "Order ID is required" },
                { status: 400 }
            );
        }

        // Call backend using the standard fetchWithAuth which handles admin_session and API keys
        const response = await fetchWithAuth(`/api/admin/payments/cregis/query`, {
            method: 'POST',
            body: JSON.stringify({ orderId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Cregis Proxy] Backend error:', errorText);
            return NextResponse.json(
                { message: `Backend error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[Cregis Proxy] Error:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
