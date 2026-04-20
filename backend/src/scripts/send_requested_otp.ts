
import { EmailService } from '../services/email-service';
import { OTPService } from '../services/otp-service';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env relative to this script's location or current dir
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendRequestedOTP() {
    const email = 'samirhansda6219@gmail.com';
    console.log(`Sending requested OTP to: ${email}`);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();

    let userId = '';
    let name = 'Valued Trader';

    if (profile) {
        userId = profile.id;
        name = profile.full_name || 'Valued Trader';
        console.log(`Found user ID: ${userId}, Name: ${name}`);
    } else {
        console.log(`User not found in DB. I will use a placeholder ID to generate OTP if necessary, but ideally user should exist.`);
        // For security reasons, we should probably not send OTP if user doesn't exist, 
        // but if the user specifically asked for it, we might want to override or check why.
        // In this case, let's assume the user exists or we use a temporary session ID.
        userId = 'temp-request-' + Date.now();
    }

    try {
        console.log("Generating OTP...");
        const otp = await OTPService.generateOTP(userId);
        console.log(`Generated OTP: ${otp}`);

        console.log("Sending email via SMTP...");
        await EmailService.sendFinancialOTP(email, name, otp, 'payout');

        console.log("✅ Successfully generated OTP and requested email sending!");
    } catch (error) {
        console.error("❌ Failed to send OTP email:", error);
    }

    process.exit(0);
}

sendRequestedOTP();
