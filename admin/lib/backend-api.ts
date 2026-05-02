import { 
    MOCK_ADMIN_METRICS, 
    MOCK_CHALLENGES, 
    MOCK_USERS_LIST, 
    MOCK_COMPETITIONS,
    MOCK_KYC_REQUESTS,
    MOCK_PAYOUTS,
    MOCK_COUPONS,
    MOCK_MT5_ACCOUNTS,
    MOCK_PAYMENTS,
    MOCK_SYSTEM_HEALTH
} from './mock-data';

export async function fetchFromBackend(endpoint: string, options: RequestInit & { requireAuth?: boolean } = {}) {
    console.log(`[MOCK ADMIN API] ${options.method || 'GET'} ${endpoint}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Normalize endpoint for matching
    const url = endpoint.split('?')[0];

    // --- Accounts & Users ---
    if (url.includes('/api/mt5/accounts')) {
        return { success: true, accounts: MOCK_MT5_ACCOUNTS };
    }
    if (url.includes('/api/kyc')) {
        return { success: true, requests: MOCK_KYC_REQUESTS };
    }
    if (url.includes('/api/payouts')) {
        return { success: true, payouts: MOCK_PAYOUTS };
    }
    if (url.includes('/api/admin/metrics') || url.includes('/api/dashboard/stats')) {
        return { success: true, stats: MOCK_ADMIN_METRICS };
    }

    // --- Marketing & Sales ---
    if (url.includes('/api/coupons')) {
        return { success: true, coupons: MOCK_COUPONS };
    }
    if (url.includes('/api/payments')) {
        return { success: true, payments: MOCK_PAYMENTS };
    }
    if (url.includes('/api/competitions/admin')) {
        return MOCK_COMPETITIONS;
    }
    if (url.includes('/api/admin/email/send-custom-campaign')) {
        return { success: true, totalSent: 1500 };
    }

    // --- Risk & System ---
    if (url.includes('/api/admin/health') || url.includes('/api/dashboard/system-health')) {
        return MOCK_SYSTEM_HEALTH;
    }
    if (url.includes('/api/admin/risk/groups')) {
        return [
            { id: '1', group_name: 'demo\\Phase1', challenge_type: 'Phase 1', max_drawdown_percent: 10, daily_drawdown_percent: 5, profit_target_percent: 8 },
            { id: '2', group_name: 'demo\\Funded', challenge_type: 'funded', max_drawdown_percent: 8, daily_drawdown_percent: 4, profit_target_percent: null }
        ];
    }
    if (url.includes('/api/admin/risk/server-config')) {
        return {
            server_ip: '1.2.3.4',
            api_port: 443,
            manager_login: 123456,
            callback_url: 'https://api.sharkfunded.co/webhook',
            monitored_groups: ['demo\\Phase1', 'demo\\Funded']
        };
    }
    if (url.includes('/api/admin/risk/challenge-type-rules')) {
        return [
            { id: '1', type: 'Phase 1', max_drawdown: 10, daily_drawdown: 5, profit_target: 8 },
            { id: '2', type: 'Phase 2', max_drawdown: 10, daily_drawdown: 5, profit_target: 5 }
        ];
    }
    if (url.includes('/api/admin/risk/logs')) {
        return [
            { created_at: new Date().toISOString(), level: 'INFO', message: 'Risk engine heartbeat' },
            { created_at: new Date(Date.now() - 3600000).toISOString(), level: 'WARNING', message: 'Latency spike detected' }
        ];
    }

    // --- Admin Management ---
    if (url.includes('/api/admins')) {
        return {
            success: true,
            admins: [
                { id: '1', email: 'admin@sharkfunded.com', full_name: 'Demo Admin', role: 'super_admin', daily_login_count: 5, created_at: '2024-01-01' }
            ]
        };
    }

    // --- Event Verification ---
    if (url.includes('/api/event/verify')) {
        return { success: true, valid: true, message: 'Verified' };
    }

    // --- Utilities ---
    if (url.includes('/api/admin/settings/pricing')) {
        return { success: true, data: [] };
    }
    if (url.includes('/api/dashboard/calendar')) {
        return { success: true, data: [] };
    }
    if (url.includes('/api/coupons/validate')) {
        return { success: true, discount: 0.1 };
    }

    // Default response for other endpoints
    return { success: true, message: 'Mock admin response', data: [] };
}
