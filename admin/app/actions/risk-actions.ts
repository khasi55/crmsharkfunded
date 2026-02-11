"use server";

import { fetchWithAuth } from "@/utils/fetch-with-auth";

// --- GROUPS ---
export async function getRiskGroups() {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/groups`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error("getRiskGroups error:", e);
        return [];
    }
}

export async function saveRiskGroup(group: any) {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/groups`, {
            method: 'POST',
            body: JSON.stringify(group)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}

export async function deleteRiskGroup(id: string) {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/groups/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}

// --- SERVER CONFIG ---
export async function getServerConfig() {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/server-config`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error("getServerConfig error:", e);
        return {};
    }
}

export async function saveServerConfig(config: any) {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/server-config`, {
            method: 'POST',
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}

// --- LOGS ---
export async function getSystemLogs() {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/logs`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error("getSystemLogs error:", e);
        return [];
    }
}

// --- CHALLENGE TYPE RULES ---
export async function getChallengeTypeRules() {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/challenge-type-rules`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error("getChallengeTypeRules error:", e);
        return [];
    }
}

export async function saveChallengeTypeRule(rule: any) {
    try {
        const res = await fetchWithAuth(`/api/admin/risk/challenge-type-rules`, {
            method: 'POST',
            body: JSON.stringify(rule)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}
