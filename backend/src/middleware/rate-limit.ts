import rateLimit from 'express-rate-limit';

// Standard global limiter (1000 per 15m)
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Exempt critical account and login paths to prevent dashboard lockout
        const skipPaths = [
            '/api/dashboard/accounts',
            '/api/auth/session',
            '/api/user/profile'
        ];
        // Exact match or prefix match for some
        return skipPaths.some(path => req.path === path || req.path.startsWith(path + '/'));
    },
    message: { error: 'Too many requests, please try again later.' }
});

// Sensitive data limiter (e.g. login, password updates - 10 per 15m)
export const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts for this action. Please wait 15 minutes.' }
});

// Resource intensive limiter (e.g. account creation - 20 per minute)
export const resourceIntensiveLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Generating accounts too fast. Please slow down.' }
});

// Dashboard-specific limiters
export const objectivesLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60, // 60 requests per minute for objectives
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests for objectives data.' }
});

export const tradesLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100, // 100 requests per minute for trade data
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests for trade data.' }
});

// Webhook limiter (High throughput but specific protection - 5000 per 15m)
export const webhookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'High webhook volume detected. Rate limited.' }
});
