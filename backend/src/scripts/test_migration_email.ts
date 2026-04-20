import { EmailService } from '../services/email-service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const testEmail = 'siddareddy1947@gmail.com';

const subject = "Important: Your MT5 Account Login Has Changed ";

// Beautiful custom HTML
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0d47a1 0%, #001529 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">SHARK FUNDED</h1>
                            <p style="color: #bbdefb; font-size: 16px; margin: 10px 0 0 0; font-weight: 400;">Server Upgrade & Migration</p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px;">
                            <h2 style="color: #111827; font-size: 22px; font-weight: 600; margin: 0 0 20px 0;">Action Required: MT5 Details Changed</h2>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear Trader,
                            </p>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                To provide you with a faster and more reliable trading experience, we have successfully migrated our trading servers. As a result of this major upgrade, <strong>your MT5 account login ID has been changed</strong>.
                            </p>

                            <!-- Alert Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <p style="color: #1e3a8a; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">What you need to do:</p>
                                        <ol style="color: #1e40af; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                            <li style="margin-bottom: 6px;">Log in to your <strong>Shark Funded dashboard</strong>.</li>
                                            <li style="margin-bottom: 6px;">View your new <strong>MT5 Login ID</strong>.</li>
                                            <li style="margin-bottom: 6px;">Change your trading password in the portal.</li>
                                            <li>Log back into your MT5 terminal and continue trading!</li>
                                        </ol>
                                    </td>
                                </tr>
                            </table>

                            <!-- Video Link Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <p style="color: #4b5563; font-size: 15px; margin: 0 0 10px 0;"><strong>Need help?</strong> Watch our step-by-step video guide:</p>
                                        <a href="https://drive.google.com/file/d/1s7lo-a1CCdvJsSjlpJuadf_6c-udA63a/view?usp=drivesdk" target="_blank" style="display: inline-block; color: #d32f2f; font-size: 15px; font-weight: 600; text-decoration: underline;">
                                            ▶️ Watch Video Tutorial
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 30px;">
                                        <a href="https://app.sharkfunded.com/" target="_blank" style="display: inline-block; background-color: #0d47a1; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(13, 71, 161, 0.2); transition: background-color 0.3s ease;">
                                            Go To Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                                Your trading performance and balance remain completely unaffected.
                            </p>
                            
                            <!-- Divider -->
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 30px 0;">
                            
                            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
                                Best Regards,<br>
                                <strong style="color: #111827;">The Shark Funded Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6;">
                            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
                                © 2026 Shark Funded. All rights reserved.<br>
                                If you need assistance, please contact our support team.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const text = `
Important: Your MT5 Account Login Has Changed

Dear Trader,

To provide you with a faster and more reliable trading experience, we have successfully migrated our trading servers. As a result, your MT5 account login ID has been changed.

What you need to do:
1. Log in to your Shark Funded dashboard.
2. View your new MT5 Login ID.
3. Change your trading password in the portal.
4. Log back into your MT5 terminal and continue trading!

Need help? Watch our step-by-step video guide:
▶️ https://drive.google.com/file/d/1s7lo-a1CCdvJsSjlpJuadf_6c-udA63a/view?usp=drivesdk

Log in to the dashboard here: https://app.sharkfunded.com/

Your trading performance and balance remain completely unaffected.

Best Regards,
The Shark Funded Team
`;

async function sendTest() {
    try {
        console.log(`Sending test email to ${testEmail}...`);
        await EmailService.sendEmail(testEmail, subject, html, text);
        console.log(`✅ Beautiful test email sent successfully!`);
    } catch (e) {
        console.error(`❌ Failed to send:`, e);
    }
}

sendTest();
