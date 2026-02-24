import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RECIPIENT = 'siddareddy1947@gmail.com';
const NAME = 'Sidda Reddy';

async function main() {
    console.log(`🚀 Sending test payout emails to ${RECIPIENT}...`);
    try {
        console.log('1. Sending Payout Requested email...');
        await EmailService.sendPayoutRequestedNotice(RECIPIENT, NAME, 1000, 'USDT_TRC20');

        console.log('2. Sending Payout Approved email...');
        await EmailService.sendPayoutApprovedNotice(RECIPIENT, NAME, 1000, 'TXN-ABC-123');

        console.log('3. Sending Payout Rejected email...');
        await EmailService.sendPayoutRejectedNotice(RECIPIENT, NAME, 1000, 'Consistency rule violation: High frequency trading detected.');

        console.log('✅ All test payout emails sent successfully!');
    } catch (error) {
        console.error('💥 Error in main:', error);
    }
}

main();
