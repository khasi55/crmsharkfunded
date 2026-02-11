"use server";

import { fetchWithAuth } from "@/utils/fetch-with-auth";

export async function getMerchantSettings() {
    try {
        const res = await fetchWithAuth(`/api/admin/settings/merchant`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error("getMerchantSettings error:", e);
        return [];
    }
}

export async function saveMerchantSetting(setting: any) {
    try {
        const res = await fetchWithAuth(`/api/admin/settings/merchant`, {
            method: 'POST',
            body: JSON.stringify(setting)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}
