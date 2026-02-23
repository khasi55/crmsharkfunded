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
        throw new Error('Authentication required. Please log in again.');
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
        cache: 'no-store', // Disable caching to ensure fresh data
        credentials: 'include', // Support cross-origin cookies
        ...options,
        headers,
    });

    if (response.status === 401 && typeof window !== 'undefined') {
        const isAuthCheck = endpoint.includes('/api/auth/session');
        if (!isAuthCheck) {
            console.warn('Unauthorized request detected. Redirecting to login...');
            sessionStorage.removeItem('sf_backend_synced');
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
    }

    if (!response.ok) {
        let errorMsg = `Backend error: ${response.statusText}`;
        try {
            const errData = await response.json();
            if (errData.error || errData.message) {
                errorMsg = errData.message || errData.error;
            }
        } catch (e) {
            // ignore JSON parse error
        }
        throw new Error(errorMsg);
    }

    return response.json();
}
