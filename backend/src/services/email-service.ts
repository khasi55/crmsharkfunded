import nodemailer from 'nodemailer';

export class EmailService {
    // SMTP Credentials
    private static SMTP_HOST = process.env.ELASTIC_EMAIL_SMTP_HOST || 'smtp.elasticemail.com';
    private static SMTP_PORT = Number(process.env.ELASTIC_EMAIL_SMTP_PORT) || 2525;
    private static SMTP_USER = process.env.ELASTIC_EMAIL_SMTP_USER || 'noreply@sharkfunded.com';
    // Using hardcoded password as fallback from user request if env is missing
    private static SMTP_PASS = process.env.ELASTIC_EMAIL_SMTP_PASS || 'C26AD1121F3DDAFCE8CC1BD6F0F97F766132';

    private static FROM_EMAIL = process.env.ELASTIC_EMAIL_FROM || 'noreply@sharkfunded.com';
    private static FROM_NAME = 'SharkFunded';

    private static transporter = nodemailer.createTransport({
        host: EmailService.SMTP_HOST,
        port: EmailService.SMTP_PORT,
        secure: false, // 2525 is usually not implicit SSL
        auth: {
            user: EmailService.SMTP_USER,
            pass: EmailService.SMTP_PASS
        },
        debug: true, // Show debug output
        logger: true // Log to console
    });

    /**
     * Send an email using Nodemailer (SMTP)
     */
    static async sendEmail(to: string, subject: string, bodyHtml: string, bodyText: string = '') {
        try {
            console.log(`📧 Attempting to send email via SMTP to ${to}...`);

            const fromHeader = `"${this.FROM_NAME}" <${this.FROM_EMAIL}>`;
            console.log(`📧 Sender Header: ${fromHeader}`);

            const info = await this.transporter.sendMail({
                from: fromHeader,
                to: to,
                subject: subject,
                text: bodyText,
                html: bodyHtml
            });

            console.log(`✅ Email sent: ${info.messageId}`);
            return info;
        } catch (error: any) {
            console.error('🔥 Error sending email via SMTP:', error.message);
            // Don't throw, just log. We don't want to break the main flow.
        }
    }

    /**
     * Send Account Credentials (Login, Password, Server)
     */
    static async sendAccountCredentials(email: string, name: string, login: string, password: string, server: string, investorPassword?: string) {
        const subject = `Your New Trading Account Credentials - ${this.FROM_NAME}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333;">Welcome to ${this.FROM_NAME}</h2>
                <p>Dear ${name},</p>
                <p>Your new trading account has been successfully created. Here are your login details:</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Login:</strong> ${login}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p><strong>Server:</strong> ${server}</p>
                    ${investorPassword ? `<p><strong>Investor Password:</strong> ${investorPassword}</p>` : ''}
                </div>

                <p>Please download the MT5 platform and login using these credentials.</p>
                
                <p style="margin-top: 30px; font-size: 12px; color: #888;">
                    If you did not request this account, please contact our support team immediately.
                </p>
            </div>
        `;

        const text = `Dear ${name},\\n\\nYour new trading account has been created.\\n\\nLogin: ${login}\\nPassword: ${password}\\nServer: ${server}\\n${investorPassword ? `Investor Password: ${investorPassword}\\n` : ''}\\n\\nPlease login to MT5 with these details.`;

        await this.sendEmail(email, subject, html, text);
    }

    /**
     * Send Breach Notification
     */
    static async sendBreachNotification(email: string, name: string, login: string, reason: string, description: string) {
        const subject = `Account Breach Notification - Account ${login}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ffcccc; border-radius: 10px;">
                <h2 style="color: #cc0000;">Usage Violation Detected</h2>
                <p>Dear ${name},</p>
                <p>We regret to inform you that your trading account <strong>${login}</strong> has breached the risk management rules.</p>
                
                <div style="background-color: #fff0f0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #cc0000;">
                    <p><strong>Violation Type:</strong> ${reason}</p>
                    <p><strong>Details:</strong> ${description}</p>
                </div>

                <p>As a result, your account has been disabled / closed according to our terms of service.</p>
                <p>If you believe this is an error, please contact support.</p>
            </div>
        `;

        const text = `Dear ${name},\\n\\nAccount ${login} has breached risk rules.\\n\\nReason: ${reason}\\nDetails: ${description}\\n\\nYour account has been disabled. Contact support for inquiries.`;

        await this.sendEmail(email, subject, html, text);
    }

    /**
     * Send Competition Joined Confirmation
     */
    static async sendCompetitionJoined(email: string, name: string, competitionTitle: string) {
        const subject = `Competition Entry Confirmed - ${competitionTitle}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2e7d32;">You're In!</h2>
                <p>Dear ${name},</p>
                <p>You have successfully joined the competition: <strong>${competitionTitle}</strong>.</p>
                <p>We wish you the best of luck!</p>
            </div>
        `;

        const text = `Dear ${name},\\n\\nYou have successfully joined the competition: ${competitionTitle}.\\n\\nGood luck!`;

        await this.sendEmail(email, subject, html, text);
    }
}
