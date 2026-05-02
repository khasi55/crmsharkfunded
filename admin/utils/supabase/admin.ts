
import { 
    MOCK_USERS_LIST, 
    MOCK_CHALLENGES, 
    MOCK_KYC_REQUESTS, 
    MOCK_PAYOUTS, 
    MOCK_COUPONS, 
    MOCK_MT5_ACCOUNTS, 
    MOCK_PAYMENTS,
    MOCK_SYSTEM_HEALTH
} from '@/lib/mock-data';

export const createAdminClient = () => {
    const mockQueryBuilder = (table: string) => {
        const builder: any = {
            select: (fields: string, options: any = {}) => {
                return builder;
            },
            eq: () => builder,
            neq: () => builder,
            gt: () => builder,
            gte: () => builder,
            lt: () => builder,
            lte: () => builder,
            like: () => builder,
            ilike: () => builder,
            is: () => builder,
            in: () => builder,
            contains: () => builder,
            or: () => builder,
            order: () => builder,
            range: () => builder,
            limit: () => builder,
            not: () => builder,
            match: () => builder,
            filter: () => builder,
            upsert: () => builder,
            insert: () => builder,
            delete: () => builder,
            update: () => builder,
            single: async () => {
                if (table === 'admin_users') {
                    return { 
                        data: { 
                            id: 'demo-admin-id', 
                            email: 'admin@demofunded.com', 
                            password: 'mock-password', // This won't work with bcrypt.compare unless I mock loginAdmin
                            role: 'super_admin' 
                        }, 
                        error: null 
                    };
                }
                return { data: {}, error: null };
            },
            maybeSingle: async () => {
                if (table === 'admin_users') {
                    return { 
                        data: { 
                            id: 'demo-admin-id', 
                            email: 'admin@demofunded.com', 
                            password: 'mock-password',
                            role: 'super_admin' 
                        }, 
                        error: null 
                    };
                }
                return { data: null, error: null };
            },

            then: (resolve: any) => {
                let data: any = [];
                const t = table.toLowerCase();
                if (t === 'profiles' || t === 'admin_users') data = MOCK_USERS_LIST;
                else if (t === 'challenges') data = MOCK_CHALLENGES;
                else if (t === 'kyc_requests' || t === 'kyc_sessions') data = MOCK_KYC_REQUESTS;
                else if (t === 'payouts' || t === 'payout_requests') data = MOCK_PAYOUTS;
                else if (t === 'coupons') data = MOCK_COUPONS;
                else if (t === 'mt5_accounts' || t === 'accounts') data = MOCK_MT5_ACCOUNTS;
                else if (t === 'payments' || t === 'transactions' || t === 'payment_orders') data = MOCK_PAYMENTS;
                else if (t === 'system_health') data = MOCK_SYSTEM_HEALTH;
                else if (t === 'risk_violations') data = [];
                else if (t === 'affiliate_withdrawals') data = [];
                
                const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
                resolve({ data, error: null, count });
            }
        };
        return builder;
    };

    return {
        from: mockQueryBuilder,
        rpc: async () => ({ data: null, error: null }),
        auth: {
            admin: {
                listUsers: async () => ({ data: { users: [] }, error: null }),
            }
        }
    } as any;
};
