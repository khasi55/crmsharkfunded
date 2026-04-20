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
    const email = 'kunnthuwealth3004@gmail.com';
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
        console.log(`User not found in DB. Using dummy ID and name for testing.`);
    }

    try {
        // Generate an OTP using our service
        const otp = await OTPService.generateOTP(userId);
        console.log(`Generated OTP: ${otp}`);

        // Send email
        await EmailService.sendFinancialOTP(email, name, otp, 'wallet');
        console.log("✅ Successfully sent test OTP email!");

        // Don't leave the OTP hanging in redis if it's a dummy ID
        if (userId === 'test-id') {
            await OTPService.verifyOTP(userId, otp); // This validates and deletes it
            console.log("Cleaned up dummy OTP from Redis");
        }
    } catch (error) {
        console.error("❌ Failed to send test OTP email:", error);
    }

    process.exit(0);
}

sendTestOTP();
