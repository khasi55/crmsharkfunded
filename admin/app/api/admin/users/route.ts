import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const hasReferral = searchParams.get('hasReferral') === 'true';

        const supabase = createAdminClient();

        let query = supabase
            .from('profiles')
            .select('id, email, full_name, referral_code')
            .limit(100);

        if (hasReferral) {
            query = query.not('referral_code', 'is', null);
        }

        const { data: users, error } = await query;

        if (error) {
            console.error('Fetch users error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: users || [] });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
