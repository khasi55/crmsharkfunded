import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';

// Didit Webhook Events:
// - status.updated: Session status changed (pending -> in_progress -> approved/declined)
// - data.updated: KYC data was manually updated by reviewer

interface DiditWebhookPayload {
    event: 'status.updated' | 'data.updated';
    session_id: string;
    status?: string;
    vendor_data?: string; // Our user_id
    data?: {
        first_name?: string;
        last_name?: string;
        date_of_birth?: string;
        nationality?: string;
        document_type?: string;
        document_number?: string;
        document_country?: string;
        address?: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            postal_code?: string;
            country?: string;
        };
        aml?: {
            status?: string;
        };
        face_match?: {
            score?: number;
        };
        liveness?: {
            score?: number;
        };
    };
    created_at?: string;
}

export async function POST(req: Request) {
    try {
        const headersList = await headers();

        // Get the raw body for signature verification
        const body = await req.text();
        let payload: DiditWebhookPayload;

        try {
            payload = JSON.parse(body);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        console.log('Didit Webhook Received:', payload.event, payload.session_id);

        // Validate required fields
        if (!payload.session_id) {
            return NextResponse.json(
                { error: 'Missing session_id' },
                { status: 400 }
            );
        }

        // Map Didit status to our status values
        const statusMap: Record<string, string> = {
            'not_started': 'pending',
            'started': 'in_progress',
            'in_progress': 'in_progress',
            'approved': 'approved',
            'declined': 'declined',
            'expired': 'expired',
            'under_review': 'requires_review',
            'requires_review': 'requires_review',
        };

        const mappedStatus = payload.status ? (statusMap[payload.status.toLowerCase()] || payload.status) : undefined;

        // Build update object
        const updateData: Record<string, any> = {
            raw_response: payload,
        };

        if (mappedStatus) {
            updateData.status = mappedStatus;

            if (mappedStatus === 'approved' || mappedStatus === 'declined') {
                updateData.completed_at = new Date().toISOString();
            }
        }

        // Extract personal data if available
        if (payload.data) {
            const d = payload.data;
            if (d.first_name) updateData.first_name = d.first_name;
            if (d.last_name) updateData.last_name = d.last_name;
            if (d.date_of_birth) updateData.date_of_birth = d.date_of_birth;
            if (d.nationality) updateData.nationality = d.nationality;
            if (d.document_type) updateData.document_type = d.document_type;
            if (d.document_number) updateData.document_number = d.document_number;
            if (d.document_country) updateData.document_country = d.document_country;

            if (d.address) {
                if (d.address.line1) updateData.address_line1 = d.address.line1;
                if (d.address.line2) updateData.address_line2 = d.address.line2;
                if (d.address.city) updateData.city = d.address.city;
                if (d.address.state) updateData.state = d.address.state;
                if (d.address.postal_code) updateData.postal_code = d.address.postal_code;
                if (d.address.country) updateData.country = d.address.country;
            }

            if (d.aml?.status) updateData.aml_status = d.aml.status;
            if (d.face_match?.score) updateData.face_match_score = d.face_match.score;
            if (d.liveness?.score) updateData.liveness_score = d.liveness.score;
        }

        // Update the session in database
        const { data: updatedSession, error: updateError } = await supabaseAdmin
            .from('kyc_sessions')
            .update(updateData)
            .eq('didit_session_id', payload.session_id)
            .select('user_id')
            .single();

        if (updateError) {
            console.error('Error updating KYC session:', updateError);
            return NextResponse.json(
                { error: 'Failed to update session' },
                { status: 500 }
            );
        }

        // Also update the user's profile kyc_status
        if (updatedSession?.user_id && mappedStatus) {
            await supabaseAdmin
                .from('profiles')
                .update({ kyc_status: mappedStatus })
                .eq('id', updatedSession.user_id);

            console.log('Profile KYC Status Updated:', updatedSession.user_id, mappedStatus);
        }

        console.log('KYC Session Updated via Webhook:', payload.session_id, mappedStatus);

        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully',
        });

    } catch (error: any) {
        console.error('Didit Webhook Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(req: Request) {
    return NextResponse.json({
        status: 'ok',
        message: 'Didit webhook endpoint is active',
    });
}
