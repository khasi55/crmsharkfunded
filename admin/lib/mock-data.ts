export const MOCK_USER = {
    id: 'demo-admin-id',
    email: 'admin@demofunded.com',
    user_metadata: {
        full_name: 'Super Admin',
        role: 'admin'
    }
};

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

export const MOCK_USERS_LIST = [
    { id: 'u1', email: 'user1@example.com', full_name: 'John Doe', created_at: '2024-01-01' },
    { id: 'u2', email: 'user2@example.com', full_name: 'Jane Smith', created_at: '2024-01-15' },
    { id: 'u3', email: 'user3@example.com', full_name: 'Bob Wilson', created_at: '2024-02-01' },
];

export const MOCK_CHALLENGES = [
    { id: 'c1', user_email: 'user1@example.com', login: '1234567', type: 'Prime 100K', status: 'active', balance: 100000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'c2', user_email: 'user2@example.com', login: '7654321', type: 'Lite 50K', status: 'breached', balance: 48000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const MOCK_COMPETITIONS = [
    {
        id: 'comp1',
        title: 'Demo Funded Masters April',
        description: 'Elite trading competition for experienced traders.',
        start_date: '2026-04-01T00:00:00Z',
        end_date: '2026-04-30T23:59:59Z',
        entry_fee: 50,
        prize_pool: 5000,
        max_participants: 100,
        status: 'active',
        platform: 'MetaTrader 5'
    },
    {
        id: 'comp2',
        title: 'Newbie Challenge May',
        description: 'Perfect for beginners to test their skills.',
        start_date: '2026-05-01T00:00:00Z',
        end_date: '2026-05-31T23:59:59Z',
        entry_fee: 0,
        prize_pool: 1000,
        max_participants: 500,
        status: 'upcoming',
        platform: 'MatchTrader'
    }
];
export const MOCK_KYC_REQUESTS = [
    { id: 'kyc1', user_id: 'u1', full_name: 'John Doe', document_type: 'Passport', status: 'pending', created_at: new Date().toISOString() },
    { id: 'kyc2', user_id: 'u2', full_name: 'Jane Smith', document_type: 'ID Card', status: 'approved', created_at: new Date().toISOString() },
];

export const MOCK_PAYOUTS = [
    { id: 'p1', user_id: 'u1', amount: 1500, status: 'pending', method: 'Crypto', created_at: new Date().toISOString() },
    { id: 'p2', user_id: 'u2', amount: 2800, status: 'processed', method: 'Bank Transfer', created_at: new Date().toISOString() },
];

export const MOCK_COUPONS = [
    { id: 'cp1', code: 'DEMO30', discount_type: 'percentage', discount_value: 30, usage_count: 45, status: 'active' },
    { id: 'cp2', code: 'WELCOME10', discount_type: 'amount', discount_value: 10, usage_count: 120, status: 'active' },
];

export const MOCK_MT5_ACCOUNTS = [
    { id: 'mt1', login: '1234567', group: 'demo\\SF\\2-Pro', balance: 100000, equity: 102000, status: 'active' },
    { id: 'mt2', login: '7654321', group: 'demo\\S\\1-SF', balance: 50000, equity: 49000, status: 'active' },
];

export const MOCK_PAYMENTS = [
    { id: 'pay1', user_email: 'user1@example.com', amount: 499, status: 'completed', gateway: 'Demo Pay', created_at: new Date().toISOString() },
    { id: 'pay2', user_email: 'user2@example.com', amount: 299, status: 'pending', gateway: 'Cregis', created_at: new Date().toISOString() },
];

export const MOCK_SYSTEM_HEALTH = {
    overall: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
        backend_api: { status: 'healthy', latency: '45ms' },
        auth: { status: 'healthy', latency: '22ms' },
        database: { status: 'healthy', latency: '12ms' },
        redis: { status: 'healthy', latency: '5ms' },
        websocket: { status: 'healthy', connections: 1250, rooms: 85, bridge_relay: { status: 'connected' } },
        mt5_bridge: { status: 'healthy', latency: '89ms', statusCode: 200 },
        email: { status: 'healthy', latency: '150ms', provider: 'Resend' },
        payment_gateway: { status: 'healthy', latency: '110ms', provider: 'DemoPay' },
        schedulers: {
            payout_processor: { status: 'scheduled', interval: '1m' },
            breach_detector: { status: 'running', interval: '30s' },
            daily_stats_sync: { status: 'scheduled', schedule: '0 0 * * *' }
        }
    }
};
