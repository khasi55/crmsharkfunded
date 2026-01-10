import { createClient } from '@/utils/supabase/client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Fetch wrapper for Backend APIs (authenticated)
 */
export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error('No active session');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
    };

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
