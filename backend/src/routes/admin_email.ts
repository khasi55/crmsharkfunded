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
            const { data: activeAccounts, error } = await supabaseAdmin
                .from('mt5_accounts')
                .select(`
                    user_id,
                    profiles:user_id (id, email, full_name)
                `)
                .neq('status', 'breached');

            if (error) {
                console.error("Error fetching active accounts for campaign:", error);
                return res.status(500).json({ error: 'Failed to fetch target group' });
            }

            // Deduplicate by user_id
            const uniqueUsers = new Map<string, { email: string; name: string }>();

            activeAccounts?.forEach((acc: any) => {
                const profile = Array.isArray(acc.profiles) ? acc.profiles[0] : acc.profiles;
                if (profile && profile.email) {
                    uniqueUsers.set(profile.id, {
                        email: profile.email,
                        name: profile.full_name || 'Trader'
                    });
                }
            });

            targetRecipients = Array.from(uniqueUsers.values());

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
