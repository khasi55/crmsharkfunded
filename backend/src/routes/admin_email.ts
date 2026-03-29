import { Router, Response } from 'express';
import { EmailService } from '../services/email-service';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// POST /api/admin/email/send-event-invites - Send Top 32 Event Invites (admin only)
router.post('/send-event-invites', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { recipients } = req.body; // Expects array of { name, email }

        if (!recipients || !Array.isArray(recipients)) {
            return res.status(400).json({ error: 'Invalid recipients list' });
        }

        console.log(`Received request to send ${recipients.length} event invites.`);

        const results = [];

        for (const recipient of recipients) {
            try {
                await EmailService.sendEventInvite(recipient.email, recipient.name);
                results.push({ email: recipient.email, success: true });
            } catch (err: any) {
                console.error(`Failed to send invite to ${recipient.email}:`, err.message);
                results.push({ email: recipient.email, success: false, error: err.message });
            }
        }

        res.json({ success: true, results });

    } catch (error: any) {
        console.error('Send event invites error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/email/send-custom-campaign - Send custom HTML emails (admin only)
router.post('/send-custom-campaign', authenticate, requireRole(['super_admin', 'admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { subject, htmlContent, targetGroup, recipients } = req.body;

        if (!subject || !htmlContent) {
            return res.status(400).json({ error: 'Subject and HTML content are required' });
        }

        let targetRecipients: { email: string; name: string }[] = [];

        if (targetGroup === 'active_accounts') {
            // Fetch all users with non-breached MT5 accounts
            // We join profiles to get the email and name
            // Step 1: Fetch unique user_ids with active challenges
            const { data: uniqueUserIds, error: challengesError } = await supabaseAdmin
                .from('challenges')
                .select('user_id')
                .eq('status', 'active');

            if (challengesError) {
                console.error("Error fetching active user IDs:", challengesError);
                return res.status(500).json({ error: 'Failed to fetch active accounts' });
            }
            const ids = Array.from(new Set(uniqueUserIds?.map(c => c.user_id).filter(Boolean))) as string[];

            if (ids.length === 0) {
                return res.status(400).json({ error: 'No active accounts found' });
            }

            // Step 2: Fetch profiles in batches (to avoid "Bad Request" on large lists)
            const ALL_PROFILES = [];
            const BATCH_SIZE = 200;

            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                const batch = ids.slice(i, i + BATCH_SIZE);
                const { data: profiles, error: profilesError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', batch);

                if (profilesError) {
                    console.error(`Error fetching profiles batch (${i}-${i + BATCH_SIZE}):`, profilesError);
                    // Continue with next batch instead of failing everything
                    continue;
                }

                if (profiles) ALL_PROFILES.push(...profiles);
            }

            if (ALL_PROFILES.length === 0) {
                return res.status(400).json({ error: 'Failed to fetch any matching recipient profiles' });
            }

            targetRecipients = ALL_PROFILES.map(p => ({
                email: p.email,
                name: p.full_name || 'Trader'
            }));

        } else if (targetGroup === 'manual' && Array.isArray(recipients)) {
            // Use manually provided list
            targetRecipients = recipients;
        } else {
            return res.status(400).json({ error: 'Invalid target group or recipients list' });
        }

        if (targetRecipients.length === 0) {
            return res.status(400).json({ error: 'No valid recipients found for this campaign' });
        }

        console.log(`Sending custom campaign "${subject}" to ${targetRecipients.length} recipients.`);

        const results = [];

        for (const recipient of targetRecipients) {
            try {
                await EmailService.sendCustomEmail(recipient.email, recipient.name, subject, htmlContent);
                results.push({ email: recipient.email, success: true });
            } catch (err: any) {
                console.error(`Failed to send custom email to ${recipient.email}:`, err.message);
                results.push({ email: recipient.email, success: false, error: err.message });
            }
        }

        res.json({ success: true, totalSent: targetRecipients.length, results });

    } catch (error: any) {
        console.error('Send custom campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
