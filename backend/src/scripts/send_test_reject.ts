import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RECIPIENT = 'siddareddy1947@gmail.com';
const NAME = 'Sidda Reddy';
const LOGIN = '900909491233'; // Sample login from your accounts
const REASON = 'Usage of prohibited HFT strategies detected during evaluation.';
const COMMENT = 'Our risk engine flagged several high-frequency trades that violate our prop firm policies. Consequently, we cannot proceed with the upgrade to the funded stage.';

async function main() {
    console.log(`🚀 Sending test Reject/Breach email to ${RECIPIENT}...`);
    try {
        await EmailService.sendRejectNotification(RECIPIENT, NAME, LOGIN, REASON, COMMENT);
        console.log('✅ Reject notification sent successfully!');
    } catch (error) {
        console.error('💥 Error in main:', error);
    }
}

main();
