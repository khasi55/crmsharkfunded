import { Resend } from 'resend';
import { supabase } from './supabase';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sharkfunded.com';

interface EmailData {
    userId: string;
    emailType: 'hard_violation' | 'soft_violation' | 'marketing' | 'notification';
    subject: string;
    templateId?: string;
    templateData?: Record<string, any>;
    htmlContent?: string;
    textContent?: string;
}

class EmailService {
    /**
     * Send email to a single user
     */
    async sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
        try {
            // Get user email
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.userId);

            if (userError || !userData.user.email) {
                throw new Error('User email not found');
            }

            const userEmail = userData.user.email;
            let html = data.htmlContent;
            let text = data.textContent;

            // If template ID provided, fetch and render template
            if (data.templateId) {
                const { data: template, error: templateError } = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('template_id', data.templateId)
                    .single();

                if (!templateError && template) {
                    html = this.renderTemplate(template.html_content, data.templateData || {});
                    text = this.renderTemplate(template.text_content, data.templateData || {});
                }
            }

            // Send email via Resend
            const { data: emailData, error: sendError } = await resend.emails.send({
                from: FROM_EMAIL,
                to: [userEmail],
                subject: data.subject,
                html: html || '',
                text: text || '',
            });

            // Log to database
            await supabase.from('email_logs').insert({
                user_id: data.userId,
                email_type: data.emailType,
                subject: data.subject,
                template_id: data.templateId,
                template_data: data.templateData,
                status: sendError ? 'failed' : 'sent',
                error_message: sendError?.message,
                sent_at: new Date().toISOString(),
            });

            if (sendError) {
                return { success: false, error: sendError.message };
            }

            return { success: true };

        } catch (error: any) {
            console.error('Email send error:', error);

            // Log failed attempt
            await supabase.from('email_logs').insert({
                user_id: data.userId,
                email_type: data.emailType,
                subject: data.subject,
                template_id: data.templateId,
                template_data: data.templateData,
                status: 'failed',
                error_message: error.message,
            });

            return { success: false, error: error.message };
        }
    }

    /**
     * Send bulk emails (for marketing campaigns)
     */
    async sendBulkEmail(
        userIds: string[],
        emailType: 'marketing' | 'notification',
        subject: string,
        htmlContent: string,
        textContent?: string
    ): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;

        for (const userId of userIds) {
            const result = await this.sendEmail({
                userId,
                emailType,
                subject,
                htmlContent,
                textContent,
            });

            if (result.success) {
                sent++;
            } else {
                failed++;
            }

            // Rate limiting - wait 100ms between emails
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return { sent, failed };
    }

    /**
     * Send hard violation email
     */
    async sendHardViolationEmail(
        userId: string,
        accountNumber: string,
        violationType: string,
        violationDetails: string
    ): Promise<void> {
        // Get user name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        await this.sendEmail({
            userId,
            emailType: 'hard_violation',
            subject: '⚠️ Account Suspended - Trading Rule Violation',
            templateId: 'hard_violation',
            templateData: {
                userName: profile?.full_name || 'Trader',
                accountNumber,
                violationType,
                violationDetails,
                suspendedAt: new Date().toLocaleString(),
            },
        });
    }

    /**
     * Send soft violation email
     */
    async sendSoftViolationEmail(
        userId: string,
        accountNumber: string,
        warningType: string,
        warningDetails: string
    ): Promise<void> {
        // Get user name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        await this.sendEmail({
            userId,
            emailType: 'soft_violation',
            subject: '⚡ Trading Alert - Please Review',
            templateId: 'soft_violation',
            templateData: {
                userName: profile?.full_name || 'Trader',
                accountNumber,
                warningType,
                warningDetails,
                timestamp: new Date().toLocaleString(),
            },
        });
    }

    /**
     * Render template by replacing {{variable}} with values
     */
    private renderTemplate(template: string, data: Record<string, any>): string {
        let result = template;

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, String(value));
        }

        return result;
    }
}

export const emailService = new EmailService();
