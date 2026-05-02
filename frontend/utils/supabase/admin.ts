
export const createAdminClient = () => {
    return {
        from: (table: string) => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: {}, error: null }),
                    maybeSingle: async () => ({ data: {}, error: null }),
                    data: [],
                    error: null
                }),
                data: [],
                error: null
            }),
            insert: async () => ({ data: null, error: null }),
            update: async () => ({ data: null, error: null }),
            upsert: async () => ({ data: null, error: null }),
        }),
        rpc: async () => ({ data: null, error: null }),
    } as any;
};
