import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

const DIDIT_API_URL = process.env.DIDIT_API_URL || 'https://verification.didit.me/v2';
const DIDIT_CLIENT_SECRET = process.env.DIDIT_CLIENT_SECRET;

// Map Didit status to our internal status
const STATUS_MAP: Record<string, string> = {
    'Not Started': 'pending',
    'Started': 'in_progress',
    'In Progress': 'in_progress',
    'Approved': 'approved',
    'Declined': 'declined',
    'Expired': 'expired',
    'In Review': 'requires_review',
};

export async function POST(req: Request) {
    try {
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

        // Fetch latest status from Didit
        console.log('📡 Fetching Didit session:', {
            session_id: session.didit_session_id,
            url: `${DIDIT_API_URL}/session/${session.didit_session_id}/decision/`,
        });

        const diditResponse = await fetch(
            `${DIDIT_API_URL}/session/${session.didit_session_id}/decision/`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'x-api-key': DIDIT_CLIENT_SECRET!,
                },
            }
        );

        if (!diditResponse.ok) {
            const errorText = await diditResponse.text();
            console.error('Didit API Error:', diditResponse.status, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch status from Didit', details: errorText },
                { status: diditResponse.status }
            );
        }

        const diditData = await diditResponse.json();
        console.log('📥 Didit session data received:', {
            session_id: diditData.session_id,
            status: diditData.status,
            features: diditData.features,
        });

        const newStatus = STATUS_MAP[diditData.status] || diditData.status?.toLowerCase() || 'pending';

        // Build update data - extract ALL verification details
        const updateData: Record<string, any> = {
            status: newStatus,
            raw_response: diditData,
        };

        // Extract ID Verification data
        if (diditData.id_verification) {
            const idv = diditData.id_verification;
            updateData.id_verification_status = idv.status;
            if (idv.first_name) updateData.first_name = idv.first_name;
            if (idv.last_name) updateData.last_name = idv.last_name;
            if (idv.full_name) updateData.full_name = idv.full_name;
            if (idv.date_of_birth) updateData.date_of_birth = idv.date_of_birth;
            if (idv.nationality) updateData.nationality = idv.nationality;
            if (idv.gender) updateData.gender = idv.gender;
            if (idv.document_type) updateData.document_type = idv.document_type;
            if (idv.document_number) updateData.document_number = idv.document_number;
            if (idv.issuing_state) updateData.document_country = idv.issuing_state;
            if (idv.formatted_address) updateData.formatted_address = idv.formatted_address;
            if (idv.address) updateData.address_line1 = idv.address;
            if (idv.parsed_address) {
                const addr = idv.parsed_address;
                if (addr.city) updateData.city = addr.city;
                if (addr.region) updateData.state = addr.region;
                if (addr.postal_code) updateData.postal_code = addr.postal_code;
            }
        }

        // Extract Liveness data
        if (diditData.liveness) {
            updateData.liveness_status = diditData.liveness.status;
            updateData.liveness_method = diditData.liveness.method;
            if (diditData.liveness.score !== undefined) {
                updateData.liveness_score = diditData.liveness.score;
            }
        }

        // Extract Face Match data
        if (diditData.face_match) {
            updateData.face_match_status = diditData.face_match.status;
            if (diditData.face_match.score !== undefined) {
                updateData.face_match_score = diditData.face_match.score;
            }
        }

        // Extract AML data
        if (diditData.aml) {
            updateData.aml_status = diditData.aml.status;
            if (diditData.aml.score !== undefined) updateData.aml_score = diditData.aml.score;
            if (diditData.aml.total_hits !== undefined) updateData.aml_total_hits = diditData.aml.total_hits;
        }

        // Extract Phone data
        if (diditData.phone) {
            updateData.phone_status = diditData.phone.status;
            if (diditData.phone.full_number) updateData.phone_number = diditData.phone.full_number;
        }

        // Extract Email data
        if (diditData.email) {
            updateData.email_status = diditData.email.status;
            if (diditData.email.email) updateData.email_address = diditData.email.email;
        }

        // Extract POA data
        if (diditData.poa) {
            updateData.poa_status = diditData.poa.status;
        }

        // Extract NFC data
        if (diditData.nfc) {
            updateData.nfc_status = diditData.nfc.status;
        }

        // Extract Database Validation data
        if (diditData.database_validation) {
            updateData.database_validation_status = diditData.database_validation.status;
        }

        // Extract IP Analysis data
        if (diditData.ip_analysis) {
            updateData.ip_country = diditData.ip_analysis.ip_country;
            updateData.ip_country_code = diditData.ip_analysis.ip_country_code;
            updateData.is_vpn_or_tor = diditData.ip_analysis.is_vpn_or_tor || false;
        }

        // Set completed_at for terminal statuses
        if (newStatus === 'approved' || newStatus === 'declined') {
            updateData.completed_at = new Date().toISOString();
        }

        console.log('📝 Updating KYC session:', {
            session_id: session.id,
            previousStatus: session.status,
            newStatus,
            fieldsUpdated: Object.keys(updateData).length,
        });

        const { error: updateError } = await supabaseAdmin
            .from('kyc_sessions')
            .update(updateData)
            .eq('id', session.id);

        if (updateError) {
            console.error('Database update error:', updateError);
            return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
        }

        // Also update profile kyc_status
        await supabaseAdmin
            .from('profiles')
            .update({ kyc_status: newStatus })
            .eq('id', user.id);

        return NextResponse.json({
            success: true,
            previousStatus: session.status,
            newStatus: newStatus,
            diditStatus: diditData.status,
            fieldsUpdated: Object.keys(updateData),
            data: {
                id_verification: diditData.id_verification?.status,
                liveness: diditData.liveness?.status,
                face_match: diditData.face_match?.status,
                aml: diditData.aml?.status,
                phone: diditData.phone?.status,
                email: diditData.email?.status,
            }
        });

    } catch (error: any) {
        console.error('KYC Refresh Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
