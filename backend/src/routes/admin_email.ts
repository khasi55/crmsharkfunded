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

export default router;
