
import { Request } from 'express';

/**
 * Robustly extracts the client's real IP address, accounting for Cloudflare and other proxies.
 * @param req The Express request object
 * @returns The client's IP address as a string
 */
export function getClientIP(req: Request): string {
    const cfIP = req.headers['cf-connecting-ip'];
    const forwardedFor = req.headers['x-forwarded-for'];

    const ip = cfIP || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.ip || req.socket.remoteAddress || '0.0.0.0';

    // If it's a comma-separated list (from X-Forwarded-For), take the first one
    if (typeof ip === 'string' && ip.includes(',')) {
        return ip.split(',')[0].trim();
    }

    return ip as string;
}
