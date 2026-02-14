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

export async function getDeveloperSettings() {
    try {
        const res = await fetchWithAuth(`/api/admin/settings/developer`, {
            cache: 'no-store'
        });
        if (!res.ok) {
            // If endpoint doesn't exist yet, return empty to avoid crash
            if (res.status === 404) return {};
            throw new Error(`API Error: ${res.statusText}`);
        }
        return await res.json();
    } catch (e: any) {
        console.error("getDeveloperSettings error:", e);
        return {};
    }
}

export async function saveDeveloperSettings(settings: any) {
    try {
        const res = await fetchWithAuth(`/api/admin/settings/developer`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}
