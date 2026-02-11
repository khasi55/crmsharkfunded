/**
 * Client-Side Cache Utility
 * Provides in-memory caching with TTL and localStorage fallback
 * to reduce redundant API calls and improve client performance
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class ClientCache {
    private cache: Map<string, CacheEntry<any>>;
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.cache = new Map();
    }

    /**
     * Get cached data if available and not expired
     */
    get<T>(key: string): T | null {
        // Check in-memory cache first
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
            return entry.data as T;
        }

        // Fallback to localStorage
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(`cache_${key}`);
                if (stored) {
                    const parsed: CacheEntry<T> = JSON.parse(stored);
                    if (Date.now() - parsed.timestamp < parsed.ttl) {
                        // Restore to memory cache
                        this.cache.set(key, parsed);
                        return parsed.data;
                    } else {
                        // Expired, remove from localStorage
                        localStorage.removeItem(`cache_${key}`);
                    }
                }
            } catch (error) {
                console.warn('Cache read error:', error);
            }
        }

        return null;
    }

    /**
     * Set cached data with optional TTL
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.DEFAULT_TTL,
        };

        // Set in memory
        this.cache.set(key, entry);

        // Persist to localStorage
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
            } catch (error) {
                console.warn('Cache write error:', error);
            }
        }
    }

    /**
     * Invalidate specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`cache_${key}`);
        }
    }

    /**
     * Invalidate all cache entries matching a pattern
     */
    invalidatePattern(pattern: RegExp): void {
        // Clear from memory
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
            }
        }

        // Clear from localStorage
        if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_') && pattern.test(key.substring(6))) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        if (typeof window !== 'undefined') {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
}

// Singleton instance
export const cache = new ClientCache();

/**
 * Helper function to wrap API calls with caching
 */
export async function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
): Promise<T> {
    // Check cache first
    const cached = cache.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
}
