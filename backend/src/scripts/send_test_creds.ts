import { EmailService } from '../services/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RECIPIENT = 'siddareddy1947@gmail.com';
const NAME = 'Sidda Reddy';
const LOGIN = '900909490696'; // Sample login
const PASS = 'Shark777!';
const SERVER = 'Xylo Markets Ltd LIMITED';

async function main() {
    console.log(`🚀 Sending test Credentials notification to ${RECIPIENT}...`);
    try {
        await EmailService.sendAccountCredentials(RECIPIENT, NAME, LOGIN, PASS, SERVER);
        console.log('✅ Credentials notification sent successfully!');
    } catch (error) {
        console.error('💥 Error in main:', error);
    }
}

main();
