import { MOCK_ACCOUNTS, MOCK_TRADES, MOCK_STATS, MOCK_KYC, MOCK_PRICING, MOCK_USER } from './mock-data';

export async function fetchFromBackend(endpoint: string, options: RequestInit & { requireAuth?: boolean } = {}) {
    console.log(`[MOCK USER API] ${options.method || 'GET'} ${endpoint}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Normalize endpoint for matching
    const url = endpoint.split('?')[0];

    // --- Accounts & User ---
    if (url.includes('/api/dashboard/accounts')) {
        return { success: true, accounts: MOCK_ACCOUNTS };
    }

    if (url.includes('/api/auth/session')) {
        return { success: true, session: { user: MOCK_USER } };
    }

    // --- Bulk Data (The heart of the dashboard) ---
    if (url.includes('/api/dashboard/bulk')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const challengeId = urlParams.get('challenge_id');
        const account = MOCK_ACCOUNTS.find(a => a.id === challengeId) || MOCK_ACCOUNTS[0];
        
        return { 
            success: true, 
            objectives: {
                challenge: {
                    ...account,
                    initial_balance: account.initial_balance || 100000
                },
                daily_loss: {
                    current: 500,
                    max_allowed: account.initial_balance * 0.05,
                    remaining: (account.initial_balance * 0.05) - 500,
                    status: 'passed',
                    start_of_day_equity: account.initial_balance
                },
                total_loss: {
                    current: 1200,
                    max_allowed: account.initial_balance * 0.10,
                    remaining: (account.initial_balance * 0.10) - 1200,
                    status: 'passed'
                },
                profit_target: {
                    current: account.equity - account.initial_balance,
                    target: account.initial_balance * 0.10,
                    status: 'in_progress'
                },
                minimum_days: {
                    current: 5,
                    target: 5,
                    status: 'passed'
                },
                stats: {
                    equity: account.equity,
                    balance: account.balance,
                    floating_pl: account.equity - account.balance,
                    max_equity: account.equity + 500,
                    max_drawdown: 1200
                }
            },
            trades: {
                trades: MOCK_TRADES.filter(t => t.login === account.login),
                total: MOCK_TRADES.filter(t => t.login === account.login).length
            },
            stats: {
                ...MOCK_STATS,
                payouts: 2500,
                profit_factor: 2.5,
                win_rate: 65,
                avg_win: 450,
                avg_loss: -180
            },
            risk: {
                score: 85,
                level: 'Low',
                recommendations: ['Maintain current position sizing', 'Good risk-to-reward ratio observed']
            },
            consistency: {
                score: 92,
                status: 'Excellent'
            },
            calendar: {
                days: []
            },
            analysis: {
                best_pair: 'EURUSD',
                worst_pair: 'XAUUSD',
                profitable_days: ['Monday', 'Wednesday', 'Friday']
            }
        };
    }

    // --- Stats & Payouts ---
    if (url.includes('/api/overview/stats')) {
        return { success: true, stats: MOCK_STATS };
    }

    if (url.includes('/api/payouts/balance')) {
        return { success: true, balance: 2500, pending: 0 };
    }

    if (url.includes('/api/payouts/history')) {
        return { success: true, history: [
            { id: 'p1', amount: 1200, status: 'processed', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
        ] };
    }

    // --- Marketing & Config ---
    if (url.includes('/api/affiliate/stats')) {
        return { success: true, data: { earnings: 1200, referrals: 15, conversion_rate: 12.5 } };
    }

    if (url.includes('/api/kyc/status')) {
        return { success: true, ...MOCK_KYC };
    }

    if (url.includes('/api/config/pricing')) {
        return { success: true, data: MOCK_PRICING };
    }

    if (url.includes('/api/coupons/validate')) {
        return { success: true, discount: 0.1, message: 'Coupon applied successfully!' };
    }

    if (url.includes('/api/dashboard/trades')) {
        return { success: true, trades: MOCK_TRADES, total: MOCK_TRADES.length };
    }

    // Default response
    return { success: true, message: 'Mock response', data: [] };
}
