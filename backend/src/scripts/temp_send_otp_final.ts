import { EmailService } from '../services/email-service';
import { OTPService } from '../services/otp-service';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendTestOTP() {
    const email = 'kunthuwealth3004@gmail.com';
    console.log(`Sending test OTP to: ${email}`);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();

    let userId = 'test-id';
    let name = 'Valued Trader';

    if (profile) {
        userId = profile.id;
        name = profile.full_name || 'Valued Trader';
        console.log(`Found user ID: ${userId}, Name: ${name}`);
    } else {
        console.log(`User not found in DB. Exiting, must have a valid user to send OTP securely.`);
        process.exit(1);
    }

    try {
        console.log("Generating OTP...");
        const otp = await OTPService.generateOTP(userId);
        console.log(`Generated OTP: ${otp} (this is stored in Redis under the user ID)`);

        console.log("Sending email via SMTP...");
        await EmailService.sendFinancialOTP(email, name, otp, 'wallet');

        console.log("✅ Successfully generated OTP and requested email sending!");
        console.log("Tell the user to check their email right now. If it's not there, they should check Spam/Junk.");
    } catch (error) {
        console.error("❌ Failed to send test OTP email:", error);
    }

    process.exit(0);
}

sendTestOTP();
