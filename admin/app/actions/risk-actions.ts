"use server";

import { getAdminUser } from "@/utils/get-admin-user";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
        const res = await fetch(`${API_URL}/api/admin/risk/groups`, {
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
        const res = await fetch(`${API_URL}/api/admin/risk/groups`, {
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

// --- SERVER CONFIG ---
export async function getServerConfig() {
    await checkAuth();
    try {
        const res = await fetch(`${API_URL}/api/admin/risk/server-config`, {
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
        const res = await fetch(`${API_URL}/api/admin/risk/server-config`, {
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
        const res = await fetch(`${API_URL}/api/admin/risk/logs`, {
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
