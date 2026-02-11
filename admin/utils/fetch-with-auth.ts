import { cookies } from "next/headers";
import { getAdminUser } from "./get-admin-user";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'secure_admin_key_123';

/**
 * Standard fetch wrapper for admin server actions.
 * Automatically handles authentication and cookie propagation.
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const user = await getAdminUser();
    if (!user) {
        throw new Error("Unauthorized: System session expired.");
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-api-key': ADMIN_API_KEY,
            'x-admin-email': user.email,
            ...(token ? { 'Cookie': `admin_session=${token}` } : {}),
            ...options.headers,
        }
    });
}

/**
 * Fetch wrapper for system-to-system calls (e.g. cron jobs).
 * Only uses the ADMIN_API_KEY, no user session required.
 */
export async function fetchWithAdminKey(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-api-key': ADMIN_API_KEY,
            ...options.headers,
        }
    });
}
