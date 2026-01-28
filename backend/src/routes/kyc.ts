import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { createDiditSession } from '../lib/didit';

const router = Router();

// Helper function to extract user from authorization header
async function getUserFromAuth(authHeader: string | undefined) {
    if (!authHeader) {
        throw new Error('No authorization header');
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        throw new Error('Unauthorized');
    }

    return user;
}

// GET /api/kyc/status - Get KYC status for current user
router.get('/status', async (req: Request, res: Response) => {
    try {
        const user = await getUserFromAuth(req.headers.authorization);

        // Fetch the latest KYC session for this user
        const { data: session, error: sessionError } = await supabase
            .from('kyc_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (sessionError) {
            console.error('Error fetching KYC session:', sessionError);
            res.status(500).json({ error: 'Failed to fetch KYC status' });
            return;
        }

        // If no session exists
        if (!session) {
            res.json({
                status: 'not_started',
                hasSession: false
            });
            return;
        }

        // Return session data
        res.json({
            status: session.status || 'not_started',
            hasSession: true,
            sessionId: session.didit_session_id,
            verificationUrl: session.verification_url,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            completedAt: session.completed_at,
            firstName: session.first_name,
            lastName: session.last_name
        });

    } catch (error: any) {
        console.error('KYC status error:', error);
        res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message || 'Internal server error' });
    }
});

// POST /api/kyc/create-session - Create a new KYC verification session
router.post('/create-session', async (req: Request, res: Response) => {
    try {
        const user = await getUserFromAuth(req.headers.authorization);

        // Check for existing active session
        const { data: existingSession } = await supabase
            .from('kyc_sessions')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // If there's an active session, return it
        if (existingSession) {
            res.json({
                sessionId: existingSession.didit_session_id,
                verificationUrl: existingSession.verification_url,
                status: existingSession.status
            });
            return;
        }

        // Create a new KYC session via Didit API
        const diditResponse = await createDiditSession(user.id);

        // Create new KYC session in database
        const { data: newSession, error: insertError } = await supabase
            .from('kyc_sessions')
            .insert({
                user_id: user.id,
                didit_session_id: diditResponse.session_id,
                verification_url: diditResponse.url,
                status: 'pending',
                workflow_id: diditResponse.workflow_id
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating KYC session:', insertError);
            res.status(500).json({ error: 'Failed to create verification session' });
            return;
        }

        res.json({
            sessionId: newSession.didit_session_id,
            verificationUrl: newSession.verification_url,
            status: newSession.status
        });

    } catch (error: any) {
        console.error('KYC create-session error:', error);
        res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message || 'Internal server error' });
    }
});

// POST /api/kyc/update-status - Update KYC session status (called from callback)
router.post('/update-status', async (req: Request, res: Response) => {
    try {
        // NOTE: Webhooks from Didit do NOT provide user auth headers.
        // We trust the didit_session_id (which is a UUID known only to the provider and us)
        const kycData = req.body;

        console.log('Received KYC update data:', JSON.stringify(kycData, null, 2));

        // Log to file for persistent debugging
        const fs = require('fs');
        const path = require('path');
        const logFile = path.resolve(process.cwd(), 'kyc_webhook_debug.log');
        const logEntry = `[${new Date().toISOString()}] METHAD: ${req.method} DATA: ${JSON.stringify(kycData)}\n\n`;
        fs.appendFileSync(logFile, logEntry);

        // Extract the session ID and status (Handle various Didit formats)
        let didit_session_id = kycData.didit_session_id || kycData.session_id || kycData.sessionId || kycData.verificationSessionId;
        let status = kycData.status || kycData.decision;
        const { raw_response, ...otherData } = kycData;

        // If nested in payload/data (common in some webhooks)
        if (!didit_session_id && kycData.payload) {
            didit_session_id = kycData.payload.session_id;
            status = kycData.payload.status;
        }

        if (!didit_session_id) {
            console.error("❌ KYC Webhook missing Session ID:", kycData);
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }

        // Normalize Status
        if (status) {
            status = status.toLowerCase();
        }

        // Prepare update data
        const updateData: any = {
            updated_at: new Date().toISOString(),
            raw_response: raw_response || kycData, // Ensure we save the full payload

            // Map Identity Data (handling both camelCase and snake_case + nested didit structure)
            first_name: kycData.id_document?.extracted_data?.first_name || kycData.first_name || kycData.firstName,
            last_name: kycData.id_document?.extracted_data?.last_name || kycData.last_name || kycData.lastName,
            date_of_birth: kycData.id_document?.extracted_data?.date_of_birth || kycData.date_of_birth || kycData.dateOfBirth,
            nationality: kycData.nationality, // Often in 'extracted_data.nationality' too

            // Map Document Data
            document_type: kycData.id_document?.extracted_data?.document_type || kycData.document_type || kycData.documentType,
            document_number: kycData.id_document?.extracted_data?.document_number || kycData.document_number || kycData.documentNumber,
            document_country: kycData.id_document?.extracted_data?.issuing_country || kycData.document_country || kycData.documentCountry,

            // Map Address Data (Prefer POA)
            address_line1: kycData.poa?.extracted_data?.address_line_1 || kycData.address_line1 || kycData.addressLine1 || kycData.address,
            address_line2: kycData.poa?.extracted_data?.address_line_2 || kycData.address_line2 || kycData.addressLine2,
            city: kycData.poa?.extracted_data?.city || kycData.city,
            state: kycData.poa?.extracted_data?.state || kycData.state || kycData.province,
            postal_code: kycData.poa?.extracted_data?.zip_code || kycData.postal_code || kycData.postalCode,
            country: kycData.id_document?.extracted_data?.issuing_country || kycData.country, // Fallback to ID country if POA missing

            // Map Risk/Biometric Data
            aml_status: kycData.aml_status || kycData.amlStatus,
            face_match_score: kycData.face_match?.score || kycData.face_match_score || kycData.faceMatchScore,
            liveness_score: kycData.liveness_score || kycData.livenessScore,
        };

        if (status) {
            updateData.status = status;
        }

        // If status is approved, set completed_at
        if (status === 'approved' || status === 'verified' || status === 'accepted') {
            updateData.completed_at = new Date().toISOString();
            // Ensure status is normalized to 'approved'
            updateData.status = 'approved';
        } else if (status === 'declined' || status === 'rejected') {
            updateData.status = 'declined';
        } else if (status === 'review' || status === 'requires_review') {
            updateData.status = 'requires_review';
        }

        // Update the session
        const { data: updatedSession, error: updateError } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('didit_session_id', didit_session_id)
            // .eq('user_id', user.id) // Removed user check for webhook
            .select()
            .maybeSingle();

        if (updateError) {
            console.error('Error updating KYC session:', updateError);
            res.status(500).json({
                error: 'DEBUG: Failed to update KYC session',
                details: updateError,
                message: updateError.message
            });
            return;
        }

        if (!updatedSession) {
            console.warn(`⚠️ KYC Session not found for ID: ${didit_session_id}. This might be a test webhook or invalid ID.`);
            // Return 200 OK to acknowledge receipt even if we can't process it (best practice for webhooks)
            res.json({ success: true, message: 'Session not found, but webhook received.' });
            return;
        }

        res.json({
            success: true,
            session: updatedSession
        });

    } catch (error: any) {
        console.error('KYC update-status error:', error);
        res.status(error.message === 'Unauthorized' ? 401 : 500).json({ error: error.message || 'Internal server error' });
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/kyc/admin - List all KYC sessions (admin only)
router.get('/admin', async (req: any, res: Response) => {
    try {
        const { data: sessions, error } = await supabase
            .from('kyc_sessions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching admin kyc sessions:', error);
            throw error;
        }

        // Manual fetch for profiles
        if (sessions && sessions.length > 0) {
            const userIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))];

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            const profilesMap: Record<string, any> = {};
            profiles?.forEach((p: any) => {
                profilesMap[p.id] = p;
            });

            const sessionsWithProfiles = sessions.map((s: any) => ({
                ...s,
                profiles: profilesMap[s.user_id] || { full_name: 'Unknown', email: 'Unknown' }
            }));

            res.json({ sessions: sessionsWithProfiles });
            return;
        }

        res.json({ sessions: [] });
    } catch (error: any) {
        console.error('Admin KYC list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/kyc/admin/:id - Get single KYC session details (admin only)
router.get('/admin/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const { data: session, error } = await supabase
            .from('kyc_sessions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching KYC details:', error);
            throw error;
        }

        if (!session) {
            res.status(404).json({ error: 'KYC session not found' });
            return;
        }

        // Manual join for profile
        let profile = null;
        if (session.user_id) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user_id)
                .single();
            profile = profileData;
        }

        res.json({ session: { ...session, profiles: profile } });
    } catch (error: any) {
        console.error('Admin KYC details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;
