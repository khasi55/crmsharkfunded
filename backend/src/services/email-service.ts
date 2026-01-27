import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { EventEntryService } from './event-entry-service';

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
        debug: false, // Show debug output
        logger: false // Log to console
    });

    /**
     * Send an email using Nodemailer (SMTP)
     */
    static async sendEmail(to: string, subject: string, bodyHtml: string, bodyText: string = '') {
        try {
            // console.log(`📧 Attempting to send email via SMTP to ${to}...`);

            const fromHeader = `"${this.FROM_NAME}" <${this.FROM_EMAIL}>`;
            console.log(`📧 Sender Header: ${fromHeader}`);

            const info = await this.transporter.sendMail({
                from: fromHeader,
                to: to,
                subject: subject,
                text: bodyText,
                html: bodyHtml
            });

            // console.log(` Email sent: ${info.messageId}`);
            return info;
        } catch (error: any) {
            console.error(' Error sending email via SMTP:', error.message);
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
        const subject = ` Entry Confirmed: Welcome to Shark Battle Ground – ${competitionTitle}`;

        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                <h2 style="color: #0d47a1; margin-bottom: 10px;">Welcome to the Battle Ground, ${name}!</h2>
                
                <p style="font-size: 15px; color: #333;">Your entry has been successfully confirmed for:</p>
                
                <div style="padding: 12px 16px; background: #f3f7ff; border-left: 4px solid #0d47a1; margin: 15px 0; font-weight: bold;">
                    ${competitionTitle}
                </div>

                <p style="font-size: 14px; color: #444;">
                    You are now officially part of the <strong>Shark Battle Ground</strong>.  
                    Prepare your strategy, manage your risk, and compete with the best traders.
                </p>

                <div style="background-color: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; border: 1px solid #ffeeba;">
                    <strong> Important:</strong> The competition starts this coming <strong>Monday (19th January 2026)</strong>. Trading begins on that day.
                </div>

                <p style="font-size: 14px; color: #444;">
                    We wish you strong discipline, sharp execution, and a profitable journey ahead.
                </p>

                <p style="margin-top: 25px; font-size: 13px; color: #666;">
                    Best regards,<br/>
                    <strong>Shark Funded Team</strong>
                </p>
            </div>
        `;

        const text = `
Welcome to the Battle Ground, ${name}!

Your entry has been successfully confirmed for:
${competitionTitle}

You are now officially part of the Shark Battle Ground.
Prepare your strategy and compete with the best.

IMPORTANT: The competition starts this coming Monday. Trading begins on that day.

Best regards,
Shark Funded Team
        `;

        await this.sendEmail(email, subject, html, text);
    }

    /**
     * Send Top 32 Event Invitation
     */
    /**
     * Get Top 32 Event Invitation HTML
     */
    static getEventInviteHtml(name: string, qrCodeCid?: string): string {
        return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #0d47a1 0%, #002171 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800;">SHARK FUNDED COMMUNITY EVENT</h1>
           
        </div>

        <div style="padding: 40px 30px;">
            <h2>Dear ${name},</h2>

            <p style="font-size: 16px; line-height: 1.6;">
                We are delighted to invite you to the <strong>Shark Funded Community Event</strong> — an exclusive
                in-person gathering for our valued traders and partners.
                <br><br>
                This event is designed to help you connect with our team, interact with fellow traders, 
                and gain insights into upcoming opportunities, platform updates, and future growth plans.
            </p>

            ${qrCodeCid ? `
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border: 2px dashed #0d47a1; border-radius: 12px;">
                <h3 style="margin-top: 0; color: #0d47a1;">YOUR ENTRY PASS</h3>
                <p style="font-size: 14px; margin-bottom: 15px; color: #555;">Please scan this QR code at the venue entrance</p>
                <img src="${qrCodeCid}" alt="Entry QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid #ddd;" />
                <p style="font-size: 12px; color: #888; margin-top: 10px;">Pass Type: Standard Entry</p>
            </div>
            ` : ''}

            <div style="background-color: #f8f9fa; border-left: 5px solid #0d47a1; padding: 20px; margin: 25px 0;">
                <h3 style="color: #0d47a1;">Event Details</h3>
                <table style="width:100%;">
                    <tr><td><strong>Date:</strong></td><td>30th January</td></tr>
                    <tr><td><strong>Venue:</strong></td><td>Aurika Hotel, Mumbai</td></tr>
                    <tr>
                        <td><strong>Location:</strong></td>
                        <td><a href="https://maps.app.goo.gl/FP1EnzicoJiRueDH8">View on Google Maps</a></td>
                    </tr>
                    <tr><td><strong>Time:</strong></td><td>1:00 PM Onwards</td></tr>
                </table>
            </div>

            <div style="background-color:#e3f2fd; padding:15px; border-radius:8px;">
                <strong>Important Note:</strong>
                <p>Please carry a valid ID and this invitation (QR code) for smooth entry.</p>
            </div>

            <p style="text-align:center; margin-top:30px;">
                We look forward to meeting you in person and welcoming you to an engaging and insightful session.
            </p>

            <hr>

            <p style="text-align:center; font-size:13px;">
                Warm Regards,<br>
                <strong>Shark Funded Team</strong><br>
                <a href="https://sharkfunded.com">www.sharkfunded.com</a>
            </p>
        </div>
    </div>`;
    }

    static async sendEventInvite(email: string, name: string) {
        const subject = `Invitation to Shark Funded Community Event – Mumbai`;

        try {
            // Create Unique Pass in DB
            const uniqueCode = await EventEntryService.createPass(name, email);

            // Generate QR Code
            const qrData = JSON.stringify({
                name: name,
                email: email,
                event: 'Shark Funded Community Event',
                date: '2026-01-30',
                id: uniqueCode
            });

            // Generate Data URL for backup/reference if needed, but we used Buffer for proper attachment
            const qrCodeBuffer = await QRCode.toBuffer(qrData, {
                errorCorrectionLevel: 'H',
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                },
                width: 300
            });

            const html = this.getEventInviteHtml(name, 'cid:event-qrcode');

            const text = `
Dear ${name},

You are invited!

We are pleased to invite you to the Shark Funded Exclusive Event. This event brings together our community for an in-person trading meet up, networking, and reward ceremony.

Date: 30th January  
Venue: Aurika Hotel, Mumbai  
Time: 1:00 PM Sharp  
Location: https://maps.app.goo.gl/FP1EnzicoJiRueDH8  

Requirement: Please bring your personal laptop. 

** ENTRY PASS **
Please show the QR code attached to this email at the entrance.

Regards,  
Shark Funded Team
`;

            await this.transporter.sendMail({
                from: `"${this.FROM_NAME}" <${this.FROM_EMAIL}>`,
                to: email,
                subject: subject,
                text: text,
                html: html,
                attachments: [
                    {
                        filename: 'entry-qr-code.png',
                        content: qrCodeBuffer,
                        cid: 'event-qrcode' // referenced in the HTML
                    }
                ]
            });

        } catch (error: any) {
            console.error('Error generating/sending Event Invite with QR:', error);
            // Fallback without QR if it fails (using empty CID or handling gracefully in HTML)
            const html = this.getEventInviteHtml(name);
            await this.sendEmail(email, subject, html, 'Your invite (QR generation failed, please contact support).');
        }
    }
}
