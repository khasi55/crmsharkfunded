import { createClient } from '@/utils/supabase/client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch wrapper for Backend APIs (authenticated)
 */
export async function fetchFromBackend(endpoint: string, options: RequestInit & { requireAuth?: boolean } = {}) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session && options.requireAuth !== false) {
        console.warn('fetchFromBackend: No active session for endpoint', endpoint);
        // throw new Error('No active session'); // Soften this for now to prevent crashes on public data
    }


    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }


    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const response = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
}
