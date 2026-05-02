import { fetchFromBackend } from "@/lib/backend-api";

/**
 * Standard fetch wrapper for admin server actions.
 * INTERCEPTED for Demo Mode.
 * Returns a mock Response object that calls fetchFromBackend.
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    return {
        ok: true,
        json: async () => fetchFromBackend(endpoint, options),
        status: 200,
        statusText: 'OK'
    } as Response;
}

/**
 * Fetch wrapper for system-to-system calls.
 * INTERCEPTED for Demo Mode.
 */
export async function fetchWithAdminKey(endpoint: string, options: RequestInit = {}) {
    return {
        ok: true,
        json: async () => fetchFromBackend(endpoint, options),
        status: 200,
        statusText: 'OK'
    } as Response;
}
