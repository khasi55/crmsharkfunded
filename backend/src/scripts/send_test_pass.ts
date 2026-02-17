import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RECIPIENT = 'siddareddy1947@gmail.com';
const NAME = 'Sidda Reddy';
const LOGIN = '900909491233';
const PHASE = 'Phase 1';

async function main() {
    console.log(`🚀 Sending test Pass notification to ${RECIPIENT}...`);
    try {
        await EmailService.sendPassNotification(RECIPIENT, NAME, LOGIN, PHASE);
        console.log('✅ Pass notification sent successfully!');
    } catch (error) {
        console.error('💥 Error in main:', error);
    }
}

main();
