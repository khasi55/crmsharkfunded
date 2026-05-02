import { cookies } from 'next/headers';

/**
 * Extracts all cookies from the current Next.js request headers
 * and formats them into a string suitable for a 'Cookie' header.
 */
export async function getForwardableCookies(): Promise<string> {
    const cookieStore = await cookies();
    return cookieStore.getAll()
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
}
