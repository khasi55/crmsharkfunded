import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Didit KYC Webhook Handler
 * 
 * Receives full verification data when a KYC session is completed.
 * This is a PUBLIC endpoint - security relies on validating session_id exists.
 */

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

interface DiditWebhookPayload {
    session_id: string;
    session_number?: number;
    status: string;
    workflow_id?: string;
    vendor_data?: string; // This is the user_id we pass when creating session
    metadata?: Record<string, any>;
    features?: string[];

    // ID Verification
    id_verification?: {
        status: string;
        document_type?: string;
        document_number?: string;
        personal_number?: string;
        first_name?: string;
        last_name?: string;
        full_name?: string;
        date_of_birth?: string;
        age?: number;
        gender?: string;
        nationality?: string;
        issuing_state?: string;
        issuing_state_name?: string;
        address?: string;
        formatted_address?: string;
        parsed_address?: Record<string, any>;
        expiration_date?: string;
        date_of_issue?: string;
        place_of_birth?: string;
        portrait_image?: string;
        front_image?: string;
        back_image?: string;
        warnings?: Array<{ risk: string; short_description: string }>;
    };

    // Liveness
    liveness?: {
        status: string;
        method?: string;
        score?: number;
        reference_image?: string;
        age_estimation?: number;
        warnings?: Array<{ risk: string; short_description: string }>;
    };

    // Face Match
    face_match?: {
        status: string;
        score?: number;
        source_image?: string;
        target_image?: string;
        warnings?: Array<{ risk: string; short_description: string }>;
    };

    // AML Screening
    aml?: {
        status: string;
        score?: number;
        total_hits?: number;
        hits?: Array<Record<string, any>>;
        screened_data?: Record<string, any>;
        warnings?: Array<{ risk: string; short_description: string }>;
    };

    // Phone Verification
    phone?: {
        status: string;
        phone_number?: string;
        full_number?: string;
        country_code?: string;
        is_disposable?: boolean;
        is_virtual?: boolean;
        verified_at?: string;
    };

    // Email Verification
    email?: {
        status: string;
        email?: string;
        is_breached?: boolean;
        is_disposable?: boolean;
        verified_at?: string;
    };

    // Proof of Address
    poa?: {
        status: string;
        document_type?: string;
        poa_address?: string;
        poa_formatted_address?: string;
        issue_date?: string;
    };

    // NFC
    nfc?: {
        status: string;
        chip_data?: Record<string, any>;
        authenticity?: Record<string, any>;
    };

    // Database Validation
    database_validation?: {
        status: string;
        match_type?: string;
        validations?: Array<Record<string, any>>;
    };

    // IP Analysis
    ip_analysis?: {
        status: string;
        ip_country?: string;
        ip_country_code?: string;
        ip_city?: string;
        is_vpn_or_tor?: boolean;
        is_data_center?: boolean;
        device_brand?: string;
        device_model?: string;
        browser_family?: string;
        os_family?: string;
    };

    // Review history
    reviews?: Array<{
        user: string;
        new_status: string;
        comment?: string;
        created_at: string;
    }>;

    created_at?: string;
}

export async function POST(req: Request) {
    try {
        const payload: DiditWebhookPayload = await req.json();

        console.log('📥 Didit Webhook Received:', {
            session_id: payload.session_id,
            status: payload.status,
            vendor_data: payload.vendor_data,
            features: payload.features,
        });

        // Validate required fields
        if (!payload.session_id) {
            console.error('Missing session_id in webhook payload');
            return NextResponse.json(
                { error: 'Missing session_id' },
                { status: 400 }
            );
        }

        // Find the session in our database
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('kyc_sessions')
            .select('*')
            .eq('didit_session_id', payload.session_id)
            .single();

        if (sessionError || !session) {
            console.error('Session not found:', payload.session_id, sessionError);
            // Still return 200 to acknowledge receipt (Didit may retry otherwise)
            return NextResponse.json(
                { error: 'Session not found', session_id: payload.session_id },
                { status: 200 }
            );
        }

        // Map status
        const newStatus = STATUS_MAP[payload.status] || payload.status?.toLowerCase() || 'pending';

        // Build update data
        const updateData: Record<string, any> = {
            status: newStatus,
            raw_response: payload,
        };

        // Extract ID Verification data
        if (payload.id_verification) {
            const idv = payload.id_verification;
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
        if (payload.liveness) {
            updateData.liveness_status = payload.liveness.status;
            updateData.liveness_method = payload.liveness.method;
            if (payload.liveness.score !== undefined) {
                updateData.liveness_score = payload.liveness.score;
            }
        }

        // Extract Face Match data
        if (payload.face_match) {
            updateData.face_match_status = payload.face_match.status;
            if (payload.face_match.score !== undefined) {
                updateData.face_match_score = payload.face_match.score;
            }
        }

        // Extract AML data
        if (payload.aml) {
            updateData.aml_status = payload.aml.status;
            if (payload.aml.score !== undefined) updateData.aml_score = payload.aml.score;
            if (payload.aml.total_hits !== undefined) updateData.aml_total_hits = payload.aml.total_hits;
        }

        // Extract Phone data
        if (payload.phone) {
            updateData.phone_status = payload.phone.status;
            if (payload.phone.full_number) updateData.phone_number = payload.phone.full_number;
        }

        // Extract Email data
        if (payload.email) {
            updateData.email_status = payload.email.status;
            if (payload.email.email) updateData.email_address = payload.email.email;
        }

        // Extract POA data
        if (payload.poa) {
            updateData.poa_status = payload.poa.status;
        }

        // Extract NFC data
        if (payload.nfc) {
            updateData.nfc_status = payload.nfc.status;
        }

        // Extract Database Validation data
        if (payload.database_validation) {
            updateData.database_validation_status = payload.database_validation.status;
        }

        // Extract IP Analysis data
        if (payload.ip_analysis) {
            updateData.ip_country = payload.ip_analysis.ip_country;
            updateData.ip_country_code = payload.ip_analysis.ip_country_code;
            updateData.is_vpn_or_tor = payload.ip_analysis.is_vpn_or_tor || false;
        }

        // Set completed_at for terminal statuses
        if (newStatus === 'approved' || newStatus === 'declined') {
            updateData.completed_at = new Date().toISOString();
        }

        console.log('📝 Updating KYC session:', {
            session_id: session.id,
            newStatus,
            fieldsUpdated: Object.keys(updateData).length,
        });

        // Update the session
        const { error: updateError } = await supabaseAdmin
            .from('kyc_sessions')
            .update(updateData)
            .eq('id', session.id);

        if (updateError) {
            console.error('Failed to update session:', updateError);
            return NextResponse.json(
                { error: 'Failed to update session' },
                { status: 500 }
            );
        }

        // Also update profile kyc_status (the trigger should do this, but let's be explicit)
        await supabaseAdmin
            .from('profiles')
            .update({ kyc_status: newStatus })
            .eq('id', session.user_id);

        console.log('✅ KYC Webhook processed successfully:', {
            session_id: payload.session_id,
            user_id: session.user_id,
            previousStatus: session.status,
            newStatus,
        });

        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully',
            session_id: payload.session_id,
            status: newStatus,
        });

    } catch (error: any) {
        console.error('❌ KYC Webhook Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// Handle GET request - Didit sends callback data via query params
export async function GET(req: Request) {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('verificationSessionId') || url.searchParams.get('session_id');
    const status = url.searchParams.get('status');

    console.log('📥 Didit Callback (GET):', { sessionId, status, allParams: Object.fromEntries(url.searchParams) });

    // If no session ID, just return health check
    if (!sessionId) {
        return NextResponse.json({
            status: 'ok',
            message: 'KYC Webhook endpoint is active',
            timestamp: new Date().toISOString(),
        });
    }

    try {
        // Find the session in our database
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('kyc_sessions')
            .select('*')
            .eq('didit_session_id', sessionId)
            .single();

        if (sessionError || !session) {
            console.error('Session not found:', sessionId);
            return NextResponse.json({ error: 'Session not found' }, { status: 200 });
        }

        // Fetch full data from Didit API
        const DIDIT_API_URL = process.env.DIDIT_API_URL || 'https://verification.didit.me/v2';
        const DIDIT_CLIENT_SECRET = process.env.DIDIT_CLIENT_SECRET;

        console.log('📡 Fetching full session data from Didit:', `${DIDIT_API_URL}/session/${sessionId}/decision/`);

        const diditResponse = await fetch(`${DIDIT_API_URL}/session/${sessionId}/decision/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'x-api-key': DIDIT_CLIENT_SECRET!,
            },
        });

        if (diditResponse.ok) {
            const diditData = await diditResponse.json();
            console.log('📥 Full Didit data received:', { status: diditData.status, features: diditData.features });

            // Process like webhook POST
            const newStatus = STATUS_MAP[diditData.status] || diditData.status?.toLowerCase() || 'pending';
            const updateData: Record<string, any> = {
                status: newStatus,
                raw_response: diditData,
            };

            // Extract all verification data (same as POST handler)
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
            }

            if (diditData.liveness) {
                updateData.liveness_status = diditData.liveness.status;
                updateData.liveness_method = diditData.liveness.method;
                if (diditData.liveness.score !== undefined) updateData.liveness_score = diditData.liveness.score;
            }

            if (diditData.face_match) {
                updateData.face_match_status = diditData.face_match.status;
                if (diditData.face_match.score !== undefined) updateData.face_match_score = diditData.face_match.score;
            }

            if (diditData.aml) {
                updateData.aml_status = diditData.aml.status;
                if (diditData.aml.score !== undefined) updateData.aml_score = diditData.aml.score;
                if (diditData.aml.total_hits !== undefined) updateData.aml_total_hits = diditData.aml.total_hits;
            }

            if (diditData.phone) {
                updateData.phone_status = diditData.phone.status;
                if (diditData.phone.full_number) updateData.phone_number = diditData.phone.full_number;
            }

            if (diditData.email) {
                updateData.email_status = diditData.email.status;
                if (diditData.email.email) updateData.email_address = diditData.email.email;
            }

            if (diditData.ip_analysis) {
                updateData.ip_country = diditData.ip_analysis.ip_country;
                updateData.ip_country_code = diditData.ip_analysis.ip_country_code;
                updateData.is_vpn_or_tor = diditData.ip_analysis.is_vpn_or_tor || false;
            }

            if (newStatus === 'approved' || newStatus === 'declined') {
                updateData.completed_at = new Date().toISOString();
            }

            console.log('📝 Saving to database:', { sessionId, fieldsCount: Object.keys(updateData).length, fields: Object.keys(updateData) });

            const { error: updateError } = await supabaseAdmin.from('kyc_sessions').update(updateData).eq('id', session.id);
            if (updateError) {
                console.error('❌ Database update failed:', updateError);
                return NextResponse.json({ error: 'Database update failed', details: updateError.message }, { status: 500 });
            }

            const { error: profileError } = await supabaseAdmin.from('profiles').update({ kyc_status: newStatus }).eq('id', session.user_id);
            if (profileError) {
                console.error('⚠️ Profile update failed:', profileError);
            }

            console.log('✅ Session updated from GET callback:', { sessionId, newStatus });

            return NextResponse.json({ success: true, status: newStatus, fieldsUpdated: Object.keys(updateData).length });
        } else {
            // Didit API failed, just update with status from query param
            console.log('⚠️ Could not fetch full data from Didit, using query param status');

            const newStatus = STATUS_MAP[status || ''] || status?.toLowerCase() || session.status;
            await supabaseAdmin.from('kyc_sessions').update({ status: newStatus }).eq('id', session.id);
            await supabaseAdmin.from('profiles').update({ kyc_status: newStatus }).eq('id', session.user_id);

            return NextResponse.json({ success: true, status: newStatus, partial: true });
        }
    } catch (error: any) {
        console.error('GET webhook error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

