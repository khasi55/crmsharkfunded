import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

// Valid KYC statuses
const validStatuses = ['pending', 'in_progress', 'approved', 'declined', 'expired', 'requires_review'];

interface KycUpdateData {
    status?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    nationality?: string;
    document_type?: string;
    document_number?: string;
    document_country?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    aml_status?: string;
    face_match_score?: number;
    liveness_score?: number;
    didit_session_id?: string;
    raw_response?: any;
}

export async function POST(req: Request) {
    try {
        const body: KycUpdateData = await req.json();
        const { status } = body;

        if (status && !validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the user's latest KYC session
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('kyc_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'No KYC session found' }, { status: 404 });
        }

        // Build update data - only include fields that are provided
        const updateData: Record<string, any> = {};

        if (status) updateData.status = status;
        if (body.first_name) updateData.first_name = body.first_name;
        if (body.last_name) updateData.last_name = body.last_name;
        if (body.date_of_birth) updateData.date_of_birth = body.date_of_birth;
        if (body.nationality) updateData.nationality = body.nationality;
        if (body.document_type) updateData.document_type = body.document_type;
        if (body.document_number) updateData.document_number = body.document_number;
        if (body.document_country) updateData.document_country = body.document_country;
        if (body.address_line1) updateData.address_line1 = body.address_line1;
        if (body.address_line2) updateData.address_line2 = body.address_line2;
        if (body.city) updateData.city = body.city;
        if (body.state) updateData.state = body.state;
        if (body.postal_code) updateData.postal_code = body.postal_code;
        if (body.country) updateData.country = body.country;
        if (body.aml_status) updateData.aml_status = body.aml_status;
        if (body.face_match_score) updateData.face_match_score = body.face_match_score;
        if (body.liveness_score) updateData.liveness_score = body.liveness_score;
        if (body.raw_response) updateData.raw_response = body.raw_response;

        if (status === 'approved' || status === 'declined') {
            updateData.completed_at = new Date().toISOString();
        }

        console.log('Updating KYC session with data:', updateData);

        const { error: updateError } = await supabaseAdmin
            .from('kyc_sessions')
            .update(updateData)
            .eq('id', session.id);

        if (updateError) {
            console.error('Database update error:', updateError);
            return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
        }

        // Also update the profile's kyc_status if status changed
        if (status) {
            await supabaseAdmin
                .from('profiles')
                .update({ kyc_status: status })
                .eq('id', user.id);
        }

        return NextResponse.json({
            success: true,
            previousStatus: session.status,
            newStatus: status || session.status,
            updatedFields: Object.keys(updateData),
        });

    } catch (error: any) {
        console.error('KYC Update Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
