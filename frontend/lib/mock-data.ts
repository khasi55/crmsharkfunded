export const MOCK_USER = {
    id: 'demo-user-id',
    email: 'demo@demofunded.com',
    user_metadata: {
        full_name: 'Demo Trader',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo'
    }
};

export const MOCK_ACCOUNTS = [
    {
        id: 'acc_1',
        login: '1234567',
        challenge_number: 'SF-1234567',
        challenge_type: 'Prime 100K Phase 1',
        current_balance: 100000,
        current_equity: 102500,
        balance: 100000,
        equity: 102500,
        initial_balance: 100000,
        master_password: 'demo-password-1',
        status: 'active',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'acc_2',
        login: '7654321',
        challenge_number: 'SF-7654321',
        challenge_type: 'Lite 50K Phase 2',
        current_balance: 52000,
        current_equity: 51800,
        balance: 52000,
        equity: 51800,
        initial_balance: 50000,
        master_password: 'demo-password-2',
        status: 'active',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
];

export const MOCK_TRADES = [
    {
        id: 1,
        login: '1234567',
        symbol: 'EURUSD',
        type: 'buy',
        volume: 1.0,
        open_price: 1.0850,
        close_price: 1.0900,
        profit: 500,
        open_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        close_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 2,
        login: '1234567',
        symbol: 'GBPUSD',
        type: 'sell',
        volume: 0.5,
        open_price: 1.2650,
        close_price: 1.2600,
        profit: 250,
        open_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        close_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 3,
        login: '7654321',
        symbol: 'XAUUSD',
        type: 'buy',
        volume: 0.1,
        open_price: 2020.50,
        close_price: 2035.00,
        profit: 1450,
        open_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        close_time: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    }
];

export const MOCK_STATS = {
    total_balance: 152000,
    total_payouts: 5400,
    active_challenges: 2,
    passed_challenges: 1,
    equity_curve: [
        { date: '2024-04-01', value: 100000 },
        { date: '2024-04-05', value: 101200 },
        { date: '2024-04-10', value: 99500 },
        { date: '2024-04-15', value: 103000 },
        { date: '2024-04-20', value: 102500 },
    ]
};

export const MOCK_KYC = {
    status: 'completed',
    verified_at: new Date().toISOString(),
};

export const MOCK_PRICING = [
    { id: 1, name: 'Prime 5K', price: 49, discounted_price: 34.3 },
    { id: 2, name: 'Prime 10K', price: 99, discounted_price: 69.3 },
    { id: 3, name: 'Prime 25K', price: 199, discounted_price: 139.3 },
    { id: 4, name: 'Prime 50K', price: 299, discounted_price: 209.3 },
    { id: 5, name: 'Prime 100K', price: 499, discounted_price: 349.3 },
];

export const MOCK_ADMIN_METRICS = {
    total_users: 1250,
    active_accounts: 850,
    total_revenue: 125000,
    pending_payouts: 12,
    payout_amount: 8500,
    revenue_chart: [
        { name: 'Jan', revenue: 15000 },
        { name: 'Feb', revenue: 22000 },
        { name: 'Mar', revenue: 35000 },
        { name: 'Apr', revenue: 53000 },
    ]
};
