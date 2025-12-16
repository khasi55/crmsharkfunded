import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

// Didit API Configuration
const DIDIT_API_URL = process.env.DIDIT_API_URL || 'https://verification.didit.me/v2';
const DIDIT_CLIENT_ID = process.env.DIDIT_CLIENT_ID;
const DIDIT_CLIENT_SECRET = process.env.DIDIT_CLIENT_SECRET;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;

export async function POST(req: Request) {
    try {
        // Validate environment variables
        if (!DIDIT_CLIENT_ID || !DIDIT_CLIENT_SECRET || !DIDIT_WORKFLOW_ID) {
            console.error('Missing Didit credentials:', {
                hasClientId: !!DIDIT_CLIENT_ID,
                hasClientSecret: !!DIDIT_CLIENT_SECRET,
                hasWorkflowId: !!DIDIT_WORKFLOW_ID,
            });
            return NextResponse.json(
                { error: 'KYC service not configured. Please set DIDIT_CLIENT_ID, DIDIT_CLIENT_SECRET, and DIDIT_WORKFLOW_ID.' },
                { status: 500 }
            );
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user already has a pending/in_progress session
        const { data: existingSession } = await supabaseAdmin
            .from('kyc_sessions')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingSession) {
            return NextResponse.json({
                success: true,
                sessionId: existingSession.didit_session_id,
                verificationUrl: existingSession.verification_url,
                status: existingSession.status,
                message: 'Existing verification session found'
            });
        }

        // Create session with Didit API using API key directly
        // Use the webhook endpoint to receive full verification data
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const callbackUrl = `${baseUrl}/api/kyc/webhook`;
        const redirectUrl = `${baseUrl}/dashboard`; // Redirect user here after verification

        console.log('Creating Didit session with:', {
            url: `${DIDIT_API_URL}/session/`,
            workflow_id: DIDIT_WORKFLOW_ID,
            callback: callbackUrl,
            redirect_url: redirectUrl,
        });

        // Use x-api-key header as per Didit API documentation
        const diditResponse = await fetch(`${DIDIT_API_URL}/session/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': DIDIT_CLIENT_SECRET!,
            },
            body: JSON.stringify({
                workflow_id: DIDIT_WORKFLOW_ID,
                vendor_data: user.id,
                callback: callbackUrl,
                redirect_url: redirectUrl,
            }),
        });

        const responseText = await diditResponse.text();
        console.log('Didit API Response:', diditResponse.status, responseText);

        if (!diditResponse.ok) {
            let errorData = {};
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { raw: responseText };
            }
            console.error('Didit API Error:', diditResponse.status, errorData);
            return NextResponse.json(
                { error: 'Failed to create verification session', details: errorData },
                { status: diditResponse.status }
            );
        }

        const diditData = JSON.parse(responseText);

        // Store session in database
        const { data: session, error: insertError } = await supabaseAdmin
            .from('kyc_sessions')
            .insert({
                user_id: user.id,
                didit_session_id: diditData.session_id || diditData.id,
                workflow_id: DIDIT_WORKFLOW_ID,
                verification_url: diditData.url || diditData.verification_url,
                status: 'pending',
                raw_response: diditData,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Database insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to save session' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            sessionId: session.didit_session_id,
            verificationUrl: session.verification_url,
            status: session.status,
        });

    } catch (error: any) {
        console.error('KYC Session Creation Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}


