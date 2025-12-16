import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the latest KYC session for the user
        const { data: session, error } = await supabaseAdmin
            .from('kyc_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Error fetching KYC status:', error);
            return NextResponse.json(
                { error: 'Failed to fetch KYC status' },
                { status: 500 }
            );
        }

        if (!session) {
            return NextResponse.json({
                status: 'not_started',
                hasSession: false,
                message: 'No KYC verification started'
            });
        }

        // Return session status and relevant data
        return NextResponse.json({
            status: session.status,
            hasSession: true,
            sessionId: session.didit_session_id,
            verificationUrl: session.verification_url,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            completedAt: session.completed_at,
            // Only include personal data if approved
            ...(session.status === 'approved' && {
                firstName: session.first_name,
                lastName: session.last_name,
                documentType: session.document_type,
                amlStatus: session.aml_status,
            }),
        });

    } catch (error: any) {
        console.error('KYC Status Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
