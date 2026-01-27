import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { emailService } from '../lib/email';
import { EmailService as NodemailerEmailService } from '../services/email-service';

const router = Router();

// GET /api/email/logs - Get user's email history
router.get('/logs', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: logs, error } = await supabase
            .from('email_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching email logs:', error);
            res.status(500).json({ error: 'Failed to fetch email logs' });
            return;
        }

        res.json({ logs: logs || [] });

    } catch (error: any) {
        console.error('Email logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/email/templates - List email templates
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { data: templates, error } = await supabase
            .from('email_templates')
            .select('template_id, name, subject, variables')
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({ error: 'Failed to fetch templates' });
            return;
        }

        res.json({ templates: templates || [] });

    } catch (error: any) {
        console.error('Templates error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/email/send - Send single email (admin only for now)
router.post('/send', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { userId, emailType, subject, htmlContent, textContent, templateId, templateData } = req.body;

        if (!userId || !emailType || !subject) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const result = await emailService.sendEmail({
            userId,
            emailType,
            subject,
            htmlContent,
            textContent,
            templateId,
            templateData,
        });

        if (!result.success) {
            res.status(500).json({ error: result.error || 'Failed to send email' });
            return;
        }

        res.json({ success: true, message: 'Email sent successfully' });

    } catch (error: any) {
        console.error('Send email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/email/bulk - Send bulk emails (admin only)
router.post('/bulk', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // TODO: Add admin check here
        // For now, allowing authenticated users

        const { userIds, subject, htmlContent, textContent, emailType } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            res.status(400).json({ error: 'User IDs array is required' });
            return;
        }

        if (!subject || !htmlContent) {
            res.status(400).json({ error: 'Subject and content are required' });
            return;
        }

        const result = await emailService.sendBulkEmail(
            userIds,
            emailType || 'marketing',
            subject,
            htmlContent,
            textContent
        );

        res.json({
            success: true,
            sent: result.sent,
            failed: result.failed,
            total: userIds.length
        });

    } catch (error: any) {
        console.error('Bulk email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/email/send-account-credentials - Send MT5 account credentials (admin use)
router.post('/send-account-credentials', async (req, res: Response) => {
    try {
        const { email, name, accountSize, login, masterPassword, investorPassword, server, mt5Group, planType } = req.body;

        if (!email || !login || !masterPassword) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Create email content
        const subject = `Your SharkFunded MT5 Account Credentials - ${planType}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">Welcome to SharkFunded!</h2>
                <p>Hi ${name},</p>
                <p>Your MT5 trading account has been successfully created. Here are your credentials:</p>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1F2937;">Account Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Package Type:</strong></td>
                            <td style="padding: 8px 0;">${planType}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Account Size:</strong></td>
                            <td style="padding: 8px 0;">$${accountSize?.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>MT5 Login:</strong></td>
                            <td style="padding: 8px 0; font-family: monospace; font-size: 16px; color: #4F46E5;">${login}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Master Password:</strong></td>
                            <td style="padding: 8px 0; font-family: monospace; font-size: 16px; color: #DC2626;">${masterPassword}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Investor Password:</strong></td>
                            <td style="padding: 8px 0; font-family: monospace; font-size: 14px;">${investorPassword}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Server:</strong></td>
                            <td style="padding: 8px 0;">${server}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>MT5 Group:</strong></td>
                            <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${mt5Group}</td>
                        </tr>
                    </table>
                </div>

                <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400E;"><strong>⚠️ Important:</strong> Keep your master password secure. Never share it with anyone.</p>
                </div>

                <h3 style="color: #1F2937;">Next Steps:</h3>
                <ol style="color: #4B5563;">
                    <li>Download MetaTrader 5 if you haven't already</li>
                    <li>Add a new account using the credentials above</li>
                    <li>Start trading according to the challenge rules</li>
                </ol>

                <p style="color: #6B7280; margin-top: 30px;">If you have any questions, please contact our support team.</p>
                
                <p style="color: #6B7280;">Best regards,<br><strong>SharkFunded Team</strong></p>
            </div>
        `;

        const textContent = `
Welcome to SharkFunded!

Hi ${name},

Your MT5 trading account has been successfully created.

Account Details:
- Package Type: ${planType}
- Account Size: $${accountSize?.toLocaleString()}
- MT5 Login: ${login}
- Master Password: ${masterPassword}
- Investor Password: ${investorPassword}
- Server: ${server}
- MT5 Group: ${mt5Group}

IMPORTANT: Keep your master password secure. Never share it with anyone.

Next Steps:
1. Download MetaTrader 5 if you haven't already
2. Add a new account using the credentials above
3. Start trading according to the challenge rules

If you have any questions, please contact our support team.

Best regards,
SharkFunded Team
        `;

        // Here you would integrate with your actual email service (Resend, SendGrid, etc.)
        // For now, we'll log it
        console.log(`Sending account credentials to ${email}`);
        console.log(textContent);

        // TODO: Integrate with actual email service
        // await emailService.send({ to: email, subject, html: htmlContent, text: textContent });

        res.json({ success: true, message: 'Credentials email sent' });

    } catch (error: any) {
        console.error('Send credentials error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/email/send-event-invite - Send Top 32 Event Invitation
router.post('/send-event-invite', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { email, name, userIds } = req.body;

        // Mode 1: Bulk Send by User IDs
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            let successCount = 0;
            let failCount = 0;

            for (const userId of userIds) {
                // Fetch user details
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', userId)
                    .single();

                if (profile && profile.email) {
                    await NodemailerEmailService.sendEventInvite(profile.email, profile.full_name || 'Trader');
                    successCount++;
                } else {
                    failCount++;
                }
            }

            res.json({ success: true, message: `Sent ${successCount} invites, ${failCount} failed.` });
            return;
        }

        // Mode 2: Single Manual Send
        if (!email || !name) {
            res.status(400).json({ error: 'Email and name are required for manual send' });
            return;
        }

        await NodemailerEmailService.sendEventInvite(email, name);
        res.json({ success: true, message: `Event invite sent to ${email}` });

    } catch (error: any) {
        console.error('Send event invite error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/email/preview-event-invite - Get HTML preview for Top 32 Event
router.post('/preview-event-invite', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;
        const html = NodemailerEmailService.getEventInviteHtml(name || "Trader Code");
        res.json({ success: true, html });
    } catch (error: any) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
