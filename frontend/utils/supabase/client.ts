import { MOCK_USER } from '@/lib/mock-data';

export function createClient() {
    const mockQueryBuilder = (table: string) => {
        const builder: any = {
            select: () => builder,
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
            single: async () => ({ data: {}, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            then: (resolve: any) => {
                resolve({ data: [], error: null, count: 0 });
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
            onAuthStateChange: (callback: any) => {
                callback('SIGNED_IN', { user: MOCK_USER });
                return { data: { subscription: { unsubscribe: () => {} } } };
            }
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
