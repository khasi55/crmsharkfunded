"use server";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'secure_admin_key_123';

export async function executeAccountAction(login: number, action: 'disable' | 'stop-out' | 'enable') {
    // 1. Verify Admin Session Cookie
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session");

    if (!adminSession?.value) {
        return { error: "Unauthorized: Please log in again." };
    }

    // 2. Determine Endpoint
    let endpoint = '';
    if (action === 'disable') endpoint = '/api/mt5/admin/disable';
    else if (action === 'stop-out') endpoint = '/api/mt5/admin/stop-out';
    else if (action === 'enable') endpoint = '/api/mt5/admin/enable';

    const url = `${BACKEND_URL}${endpoint}`;

    try {
        console.log(`🔌 Server Action: Sending ${action} request for ${login} to ${url}`);

        // 3. Call Backend with Admin Key
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': ADMIN_API_KEY
            },
            body: JSON.stringify({ login }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ Backend Error (${response.status}):`, errText);
            try {
                const errJson = JSON.parse(errText);
                return { error: errJson.error || `Server Error: ${response.statusText}` };
            } catch {
                return { error: `Server Error: ${errText}` };
            }
        }

        const result = await response.json();
        return { success: true, message: result.message, data: result };

    } catch (error: any) {
        console.error("❌ Action execution failed:", error);
        return { error: error.message || "Failed to execute action" };
    }
}
