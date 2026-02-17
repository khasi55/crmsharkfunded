import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RECIPIENT = 'siddareddy1947@gmail.com';
const NAME = 'Sidda Reddy';
const LOGIN = '900909491233';
const NEW_PLAN = '100k Prime Funded';

async function main() {
    console.log(`🚀 Sending Temporary Package Upgrade test email to ${RECIPIENT}...`);

    const subject = `Package Upgrade Confirmed - Account ${LOGIN}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d1ecf1; border-radius: 10px;">
            <h2 style="color: #0c5460;">Your Account Upgrade is Complete!</h2>
            <p>Dear ${NAME},</p>
            <p>We are pleased to inform you that your trading account <strong>${LOGIN}</strong> has been successfully upgraded to the <strong>${NEW_PLAN}</strong> package.</p>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c5460;">
                <p><strong>New Status:</strong> Active Upgrade ✅</p>
                <p><strong>New Package:</strong> ${NEW_PLAN}</p>
                <p><strong>Account Login:</strong> ${LOGIN}</p>
            </div>

            <p>Your trading credentials remain unchanged. You can continue trading on the same MT5 account with your new balance and rules applied.</p>
            
            <p>Thank you for choosing SharkFunded!</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #888;">
                This is a temporary test email sent for package upgrade verification.
            </p>
        </div>
    `;

    const text = `Congratulations ${NAME}!\n\nYour account ${LOGIN} has been upgraded to ${NEW_PLAN}.\n\nYour credentials remain the same. Thank you for trading with SharkFunded!`;

    try {
        await EmailService.sendEmail(RECIPIENT, subject, html, text);
        console.log('✅ Temporary Package Upgrade email sent successfully!');
    } catch (error) {
        console.error('💥 Error sending email:', error);
    }
}

main();
