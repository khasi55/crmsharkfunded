import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                user_metadata: user.user_metadata,
            },
        });
    } catch (error: any) {
        console.error('Session error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
