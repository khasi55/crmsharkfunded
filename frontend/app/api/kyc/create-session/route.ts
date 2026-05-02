import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getForwardableCookies } from '@/lib/cookie-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Forward cookies (including sf_session) to backend
        const forwardedCookies = await getForwardableCookies();

        // Forward request to backend
        const response = await fetch(`${BACKEND_URL}/api/kyc/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'Cookie': forwardedCookies
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('KYC create-session API error:', error);
        return NextResponse.json(
            { error: 'Failed to create KYC session', message: error.message },
            { status: 500 }
        );
    }
}
