import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { createDiditSession } from '../lib/didit';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { AuditLogger } from '../lib/audit-logger';
import { resourceIntensiveLimiter } from '../middleware/rate-limit';
import { logSecurityEvent } from '../utils/security-logger';

const router = Router();

// GET /api/kyc/status - Get KYC status for current user
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;

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
router.post('/create-session', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

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
        const DEBUG = process.env.DEBUG === 'true';

        if (DEBUG) console.log('Received KYC update data:', JSON.stringify(kycData, null, 2));

        // extract the session ID and status (Handle various Didit formats)
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
            status = status.toLowerCase().replace(/\s+/g, '_');
        }

        // --- ENHANCED LOGIC: Fetch Full Data if Missing ---
        // If the payload is minimal (just status/id) and missing critical data, fetch from API.
        const isMinimalPayload = !kycData.id_document && !kycData.decision && !kycData.full_name;

        // Import here to avoid circular dependencies if any (though lib/didit is safe)
        const { getDiditSession } = require('../lib/didit');

        let fullData = kycData;
        if (isMinimalPayload && didit_session_id) {
            if (DEBUG) console.log(`ℹ️ Received minimal KYC payload for ${didit_session_id}. Fetching full details from DiDit...`);
            try {
                const fetchedData = await getDiditSession(didit_session_id);
                if (fetchedData) {
                    if (DEBUG) console.log('✅ Successfully fetched full KYC data from API.');
                    // Merge: existing kycData might have some useful headers/meta, but fetched has the real data.
                    // We treat fetchedData as the source of truth for identity fields.
                    fullData = { ...kycData, ...fetchedData };

                    // If fetched data has 'decision' object, unwrap it for easier mapping below 
                    // (similar to the big payload seen in logs)
                    if (fetchedData.decision) {
                        fullData = { ...fullData, ...fetchedData.decision };
                    }
                }
            } catch (err) {
                console.error('⚠️ Failed to fetch full KYC data:', err);
                // Continue with what we have to at least update status
            }
        }

        // Prepare update data using fullData
        const updateData: any = {
            updated_at: new Date().toISOString(),
            raw_response: raw_response || fullData, // Save the richest dataset we have

            // Helper to get extraction source
            // Priority: id_document (direct) -> id_verifications[0] (decision) -> root
        };


        const idVerification = fullData.id_verifications?.[0] || fullData.decision?.id_verification || {};
        const extractedData = fullData.id_document?.extracted_data || fullData.decision?.id_verification?.extracted_data || {};
        const decision = fullData.decision || {};
        const liveness = decision.liveness || fullData.liveness || {};
        const faceMatch = decision.face_match || fullData.face_match || {};

        // Identity Mapping - check decision paths first
        updateData.first_name = extractedData.first_name ||
            decision.first_name ||
            idVerification.first_name ||
            fullData.first_name ||
            fullData.firstName;

        updateData.last_name = extractedData.last_name ||
            decision.last_name ||
            idVerification.last_name ||
            fullData.last_name ||
            fullData.lastName;

        updateData.date_of_birth = extractedData.date_of_birth ||
            decision.date_of_birth ||
            idVerification.date_of_birth ||
            fullData.date_of_birth ||
            fullData.dateOfBirth;

        updateData.nationality = decision.nationality ||
            fullData.nationality ||
            extractedData.issuing_country ||
            idVerification.nationality;

        // Document Mapping
        updateData.document_type = extractedData.document_type ||
            decision.document_type ||
            idVerification.document_type ||
            fullData.document_type ||
            fullData.documentType;

        updateData.document_number = extractedData.document_number ||
            decision.document_number ||
            idVerification.document_number ||
            fullData.document_number ||
            fullData.documentNumber;

        updateData.document_country = extractedData.issuing_country ||
            decision.issuing_country ||
            idVerification.issuing_country ||
            idVerification.issuing_state ||
            fullData.document_country ||
            fullData.documentCountry;

        // Address Mapping (Prefer POA -> ID Verification Address -> Parsed Address)
        const poaData = fullData.poa?.extracted_data || decision.poa?.extracted_data || {};
        const parsedAddress = idVerification.parsed_address || decision.address || {};

        updateData.address_line1 = poaData.address_line_1 ||
            parsedAddress.address_line_1 ||
            idVerification.address ||
            parsedAddress.street_1 ||
            fullData.address_line1 ||
            fullData.addressLine1 ||
            fullData.address;

        updateData.address_line2 = poaData.address_line_2 ||
            parsedAddress.address_line_2 ||
            parsedAddress.street_2 ||
            fullData.address_line2 ||
            fullData.addressLine2;

        updateData.city = poaData.city ||
            parsedAddress.city ||
            fullData.city;

        updateData.state = poaData.state ||
            parsedAddress.region ||
            parsedAddress.state ||
            idVerification.issuing_state ||
            fullData.state ||
            fullData.province;

        updateData.postal_code = poaData.zip_code ||
            parsedAddress.postal_code ||
            parsedAddress.zip_code ||
            fullData.postal_code ||
            fullData.postalCode;

        updateData.country = extractedData.issuing_country ||
            parsedAddress.country ||
            idVerification.issuing_country ||
            updateData.document_country ||
            fullData.country;

        // Risk/Biometric Data - check decision paths
        updateData.aml_status = decision.aml?.status ||
            fullData.aml_status ||
            fullData.amlStatus ||
            (fullData.aml_screenings?.[0]?.status);

        updateData.face_match_score = faceMatch.score ||
            faceMatch.face_match_score ||
            fullData.face_match?.score ||
            fullData.face_match_score ||
            fullData.faceMatchScore ||
            (fullData.face_matches?.[0]?.face_match_score);

        updateData.liveness_score = liveness.score ||
            liveness.liveness_score ||
            fullData.liveness_score ||
            fullData.livenessScore ||
            (fullData.liveness_checks?.[0]?.liveness_score);

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

        // Notify Admins on important status changes
        if (status === 'approved' || status === 'requires_review') {
            import('../services/notification-service').then(({ NotificationService }) => {
                const notifType = status === 'approved' ? 'success' : 'warning';
                const action = status === 'approved' ? 'verified' : 'requires review';

                NotificationService.createNotification(
                    `KYC ${status === 'approved' ? 'Verified' : 'Review Needed'}`,
                    `KYC for session ${didit_session_id.substring(0, 8)}... is now ${status}.`,
                    'kyc',
                    updatedSession.user_id, // We might not have user_id in context if webhook, but updatedSession has it
                    { session_id: didit_session_id, status }
                );
            });
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
router.get('/admin', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
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
router.get('/admin/:id', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
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

// POST /api/kyc/admin/:id/approve - Manually approve a KYC session
router.post('/admin/:id/approve', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { document_url, document_type } = req.body as { document_url?: string; document_type?: string };

        const updateData: any = {
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Add manual document if provided
        if (document_url) {
            updateData.manual_document_url = document_url;
            updateData.manual_document_type = document_type || 'other';
        }

        const { data, error } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error approving KYC:', error);
            throw error;
        }

        // Send notification
        import('../services/notification-service').then(({ NotificationService }) => {
            NotificationService.createNotification(
                'KYC Approved',
                `Your KYC verification has been manually approved by an admin.`,
                'success',
                data.user_id,
                { session_id: id }
            );
        });

        res.json({
            success: true,
            message: 'KYC session approved successfully',
            session: data
        });

        // Fetch user email for logging
        const { data: kycSession } = await supabase.from('kyc_sessions').select('user_id').eq('id', id).single();
        const { data: userProfile } = kycSession?.user_id ? await supabase.from('profiles').select('email').eq('id', kycSession.user_id).single() : { data: null };
        const kycUserEmail = userProfile?.email || id;

        AuditLogger.info(req.user?.email || 'admin', `Manually approved KYC for ${kycUserEmail}`, { id, category: 'KYC' });
    } catch (error: any) {
        console.error('Approve KYC error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/kyc/admin/:id/reject - Manually reject a KYC session
router.post('/admin/:id/reject', authenticate, requireRole(['super_admin', 'admin', 'sub_admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body as { reason?: string };

        if (!reason || !reason.trim()) {
            res.status(400).json({ error: 'Rejection reason is required' });
            return;
        }

        const updateData: any = {
            status: 'rejected',
            rejection_reason: reason,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error rejecting KYC:', error);
            throw error;
        }

        // Send notification
        import('../services/notification-service').then(({ NotificationService }) => {
            NotificationService.createNotification(
                'KYC Rejected',
                `Your KYC verification has been rejected. Reason: ${reason}`,
                'error',
                data.user_id,
                { session_id: id, reason }
            );
        });

        res.json({
            success: true,
            message: 'KYC session rejected',
            session: data
        });

        const kycUserEmail = data.user_id ? (await supabase.from('profiles').select('email').eq('id', data.user_id).single()).data?.email || id : id;
        AuditLogger.warn(req.user?.email || 'admin', `Manually rejected KYC for ${kycUserEmail}. Reason: ${reason}`, { id, reason, category: 'KYC' });
    } catch (error: any) {
        console.error('Reject KYC error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;
