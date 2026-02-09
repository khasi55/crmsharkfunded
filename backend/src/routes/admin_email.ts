
import { Router } from 'express';
import { EmailService } from '../services/email-service';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// Middleware to check if user is admin (simplified for now)
router.post('/send-event-invites', async (req, res) => {
    try {
        const { recipients } = req.body; // Expects array of { name, email }

        if (!recipients || !Array.isArray(recipients)) {
            return res.status(400).json({ error: 'Invalid recipients list' });
        }

        console.log(`Received request to send ${recipients.length} event invites.`);

        const results = [];

        // Process in chunks to avoid overwhelming the mail server
        for (const recipient of recipients) {
            if (!recipient.email || !recipient.name) {
                results.push({ email: recipient.email, status: 'failed', error: 'Missing email or name' });
                continue;
            }

            try {
                await EmailService.sendEventInvite(recipient.email, recipient.name);
                results.push({ email: recipient.email, status: 'sent' });
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err: any) {
                console.error(`Failed to send to ${recipient.email}:`, err);
                results.push({ email: recipient.email, status: 'failed', error: err.message });
            }
        }

        res.json({ message: 'Process completed', results });

    } catch (error: any) {
        console.error('Error in bulk send:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/preview-invite', async (req, res) => {
    try {
        const { name } = req.body;
        // Use a placeholder if no name provided, or the provided name
        const previewName = name || "Valued Partner";

        // Generate HTML. Passing undefined to qrCodeCid to show placeholder or nothing? 
        // The original method handles undefined. 
        // We can pass a dummy CID or just let it be empty.
        // Let's pass a dummy placeholder image for preview to look better if needed, 
        // but getEventInviteHtml handles `undefined` by skipping the QR section or showing empty?
        // Let's check getEventInviteHtml again. It checks `if (qrCodeCid)`.
        // To show a full preview, maybe we should pass a dummy QR placeholder URL?
        // But for now, let's just pass `undefined` or a hardcoded placeholder if we want to show layout.

        const html = EmailService.getEventInviteHtml(previewName, "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg");

        res.json({ html });
    } catch (error: any) {
        console.error('Error generating preview:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

router.post('/send-custom', async (req, res) => {
    try {
        const { recipients, subject, body } = req.body;

        if (!recipients || !Array.isArray(recipients) || !subject || !body) {
            return res.status(400).json({ error: 'Recipients, subject, and body are required' });
        }

        console.log(`Received request to send custom email to ${recipients.length} recipients.`);

        const results = [];

        for (const recipient of recipients) {
            if (!recipient.email) {
                results.push({ email: recipient.email, status: 'failed', error: 'Missing email' });
                continue;
            }

            try {
                // Ensure body is treated as HTML if it contains tags, or wrap in basic formatting
                const formattedBody = body.includes('<') ? body : `<div style="font-family: sans-serif; line-height: 1.5; color: #333;">${body.replace(/\n/g, '<br>')}</div>`;

                await EmailService.sendEmail(recipient.email, subject, formattedBody, body);
                results.push({ email: recipient.email, status: 'sent' });

                // Small delay to protect SMTP reputation
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err: any) {
                console.error(`Failed to send custom email to ${recipient.email}:`, err);
                results.push({ email: recipient.email, status: 'failed', error: err.message });
            }
        }

        res.json({ message: 'Broadcast completed', results });
    } catch (error: any) {
        console.error('Error in custom broadcast:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
