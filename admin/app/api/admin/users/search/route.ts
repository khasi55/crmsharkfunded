import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ users: [] });
        }

        const supabase = createAdminClient();

        // Search by email or full_name
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.error('Search error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: users || [] });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
