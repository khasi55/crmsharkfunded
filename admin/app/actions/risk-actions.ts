"use server";

import { getAdminUser } from "@/utils/get-admin-user";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'secure_admin_key_123';

// Helper to check authentication
async function checkAuth() {
    const user = await getAdminUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}

// --- GROUPS ---
export async function getRiskGroups() {
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/groups`, {
            headers: { 'x-admin-api-key': ADMIN_API_KEY },
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
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': ADMIN_API_KEY
            },
            body: JSON.stringify(group)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        // console.error("saveRiskGroup error:", e);
        throw e;
    }
}

export async function deleteRiskGroup(id: string) {
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/groups/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': ADMIN_API_KEY
            }
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}

// --- SERVER CONFIG ---
export async function getServerConfig() {
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/server-config`, {
            headers: { 'x-admin-api-key': ADMIN_API_KEY },
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
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/server-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': ADMIN_API_KEY
            },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        // console.error("saveServerConfig error:", e);
        throw e;
    }
}

// --- LOGS ---
export async function getSystemLogs() {
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/logs`, {
            headers: { 'x-admin-api-key': ADMIN_API_KEY },
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
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/challenge-type-rules`, {
            headers: { 'x-admin-api-key': ADMIN_API_KEY },
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
    await checkAuth();
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/risk/challenge-type-rules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': ADMIN_API_KEY
            },
            body: JSON.stringify(rule)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}

