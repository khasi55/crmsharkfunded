import { MOCK_USER, MOCK_ADMIN_METRICS, MOCK_USERS_LIST, MOCK_CHALLENGES } from '@/lib/mock-data';

export function createClient() {
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
                if (table === 'profiles') return { data: MOCK_USERS_LIST[0], error: null };
                return { data: {}, error: null };
            },
            then: (resolve: any) => {
                let data: any[] = [];
                if (table === 'profiles' || table === 'admin_users') data = MOCK_USERS_LIST;
                if (table === 'challenges') data = MOCK_CHALLENGES;
                if (table === 'payment_orders') data = [];
                resolve({ data, error: null, count: data.length });
            }
        };
        return builder;
    };

    return {
        auth: {
            getSession: async () => ({
                data: {
                    session: {
                        user: MOCK_USER,
                        access_token: 'mock-token',
                    }
                },
                error: null
            }),
            getUser: async () => ({
                data: { user: MOCK_USER },
                error: null
            }),
            signInWithPassword: async () => ({
                data: { user: MOCK_USER, session: { access_token: 'mock-token' } },
                error: null
            }),
            signOut: async () => ({ error: null }),
        },
        from: mockQueryBuilder,
        rpc: async () => ({ data: null, error: null }),
        storage: {
            from: () => ({
                upload: async () => ({ data: { path: 'mock-path' }, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: 'https://via.placeholder.com/150' } }),
            })
        }
    } as any;
}

