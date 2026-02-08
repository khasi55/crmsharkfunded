import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RECIPIENT = 'siddareddy1947@gmail.com';
const SUBJECT = 'Your Instant Funding Opportunity - Shark Funded';

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Funding Awaits</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f6f6f6">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <!-- Header Image -->
                    <tr>
                        <td align="center">
                            <img src="https://fyirdhx.stripocdn.email/content/guids/CABINET_51fe76af2a86200575058cdb8041684a9854055115fe7b783143d5b3ecef7853/images/instant_funding_2.png" 
                                 alt="Instant Funding" 
                                 width="600" 
                                 style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" />
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; background-color: #ffffff;">
                            <div style="font-family: 'Georgia', serif; color: #2c3e50; line-height: 1.8; font-size: 17px; text-align: center;">
                                <h2 style="font-family: 'Times New Roman', serif; font-style: italic; color: #1a252f; margin-top: 0; margin-bottom: 25px; font-size: 24px;">A New Chapter in Your Trading Journey</h2>
                                
                                <p style="margin-bottom: 20px;">Distinguished Trader,</p>
                                
                                <p style="margin-bottom: 20px;">True success in the markets is built on discipline, strategy, and the right partnership. We are pleased to present you with a unique opportunity to elevate your trading career through our <strong>Instant Funding</strong> initiative.</p>
                                
                                <p style="margin-bottom: 20px;">By removing the traditional barriers to capital, we empower you to focus on what truly matters: your execution. Your talent deserves a platform that matches its ambition.</p>
                                
                                <p style="margin-bottom: 30px;">We invite you to step into the future of prop trading with Shark Funded.</p>
                                
                                <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eeeeee; font-weight: bold; color: #34495e;">
                                    Warm Regards,<br>
                                    The Shark Funded Executive Team
                                </div>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #fdfdfd; font-size: 12px; color: #95a5a6;">
                            &copy; 2026 Shark Funded. Professional Prop Trading Solutions.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const TEXT_CONTENT = `
A New Chapter in Your Trading Journey

Distinguished Trader,

True success in the markets is built on discipline, strategy, and the right partnership. We are pleased to present you with a unique opportunity to elevate your trading career through our Instant Funding initiative.

By removing the traditional barriers to capital, we empower you to focus on what truly matters: your execution. Your talent deserves a platform that matches its ambition.

We invite you to step into the future of prop trading with Shark Funded.

Warm Regards,
The Shark Funded Executive Team
`;

async function main() {
    console.log(`🚀 Sending custom email to ${RECIPIENT}...`);
    try {
        const result = await EmailService.sendEmail(RECIPIENT, SUBJECT, HTML_CONTENT, TEXT_CONTENT);
        if (result) {
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', result.messageId);
        } else {
            console.error('❌ Failed to send email.');
        }
    } catch (error) {
        console.error('💥 Error in main:', error);
    }
}

main();
