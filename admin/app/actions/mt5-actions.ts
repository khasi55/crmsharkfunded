"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { fetchWithAuth } from "@/utils/fetch-with-auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'secure_admin_key_123';

export async function executeAccountAction(login: number, action: 'disable' | 'stop-out' | 'enable') {
    // 1. Determine Endpoint
    let endpoint = '';
    if (action === 'disable') endpoint = '/api/mt5/admin/disable';
    else if (action === 'stop-out') endpoint = '/api/mt5/admin/stop-out';
    else if (action === 'enable') endpoint = '/api/mt5/admin/enable';

    try {
        // 2. Call Backend with fetchWithAuth
        const response = await fetchWithAuth(endpoint, {
            method: 'POST',
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

export async function getAccountTrades(login: number) {
    const supabase = createAdminClient();

    const { data: challenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('login', login)
        .single();

    if (!challenge) {
        return { error: "Challenge not found" };
    }

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: false, nullsFirst: false });

    if (error) {
        console.error("Error fetching trades:", error);
        return { error: "Failed to fetch trades" };
    }

    return {
        success: true,
        trades: trades || []
    };
}

export async function updateUserEmail(userId: string, newEmail: string) {
    const endpoint = '/api/admin/users/update-email';

    try {
        console.log(`🔌 Server Action: Updating email for ${userId} to ${newEmail}`);

        const response = await fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify({ userId, newEmail }),
        });

        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                return { error: errJson.error || `Server Error: ${response.statusText}` };
            } catch {
                return { error: `Server Error: ${errText}` };
            }
        }

        const result = await response.json();
        return { success: true, message: result.message };

    } catch (error: any) {
        console.error("❌ Action execution failed:", error);
        return { error: error.message || "Failed to update email" };
    }
}

export async function bulkDisableAccounts(logins: number[]) {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session");

    if (!adminSession?.value) {
        return { error: "Unauthorized: Please log in again." };
    }

    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    };

    // We'll process these in parallel batches to speed it up but not overwhelm the server
    const BATCH_SIZE = 5;

    for (let i = 0; i < logins.length; i += BATCH_SIZE) {
        const batch = logins.slice(i, i + BATCH_SIZE);
        const promises = batch.map(login => executeAccountAction(login, 'disable'));

        const batchResults = await Promise.all(promises);

        batchResults.forEach(res => {
            if (res.error) {
                results.failed++;
                results.errors.push(res.error);
            } else {
                results.success++;
            }
        });
    }

    // Revalidate the page path to refresh the UI
    // revalidatePath('/(dashboard)/accounts'); // We can't use revalidatePath in a generic action without import, but client will reload.

    return {
        success: true,
        message: `Processed ${logins.length} accounts. Success: ${results.success}, Failed: ${results.failed}`,
        details: results
    };
}

export async function disableAccountsByGroup(groupName: string) {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session");

    if (!adminSession?.value) {
        return { error: "Unauthorized: Please log in again." };
    }

    const supabase = createAdminClient();

    // 1. Get all accounts in this group
    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('login')
        .eq('group', groupName); // Note: using 'group' column

    if (error || !accounts) {
        return { error: "Failed to fetch accounts for this group" };
    }

    const logins = accounts.map(a => a.login).filter(Boolean);

    if (logins.length === 0) {
        return { error: "No accounts found in this group with valid logins." };
    }

    // 2. Reuse bulkDisableAccounts logic logic or call it directly?
    // Calling directly is better to reuse batching logic.
    return await bulkDisableAccounts(logins);
}

export async function adjustMT5Balance(login: number, amount: number, comment: string) {
    const endpoint = '/api/mt5/admin/adjust-balance';

    try {
        const response = await fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify({ login, amount, comment }),
        });

        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                return { error: errJson.error || `Server Error: ${response.statusText}` };
            } catch {
                return { error: `Server Error: ${errText}` };
            }
        }

        return { success: true, message: `Balance adjusted by $${amount}` };
    } catch (error: any) {
        return { error: error.message || "Failed to adjust balance" };
    }
}

export async function changeAccountLeverage(login: number, leverage: number) {
    const endpoint = '/api/mt5/admin/change-leverage';

    try {
        const response = await fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify({ login, leverage }),
        });

        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                return { error: errJson.error || `Server Error: ${response.statusText}` };
            } catch {
                return { error: `Server Error: ${errText}` };
            }
        }

        return { success: true, message: `Leverage changed to 1:${leverage}` };
    } catch (error: any) {
        return { error: error.message || "Failed to change leverage" };
    }
}

export async function syncMT5Trades(login: number) {
    const endpoint = '/api/mt5/sync-trades';

    try {
        console.log(`🔌 Server Action: Syncing trades for ${login}`);

        const response = await fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify({ login }),
        });

        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                return { error: errJson.error || `Server Error: ${response.statusText}` };
            } catch {
                return { error: `Server Error: ${errText}` };
            }
        }

        const result = await response.json();
        return { success: true, message: `Synced ${result.count || 0} trades successfully`, count: result.count };
    } catch (error: any) {
        console.error("❌ Sync failed:", error);
        return { error: error.message || "Failed to sync trades" };
    }
}
