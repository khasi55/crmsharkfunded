import { fetchWithAdminKey } from "@/utils/fetch-with-auth";
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log(`[Cron] Triggering MT5 sync via /api/mt5/sync-all`);

        const response = await fetchWithAdminKey(`/api/mt5/sync-all`, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[Cron] Sync trigger failed: ${response.status} ${error}`);
            return NextResponse.json({ error: 'Failed to trigger sync' }, { status: response.status });
        }

        const result = await response.json();
        console.log(`[Cron] Sync trigger success:`, result);

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error(`[Cron] Error triggering sync:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
