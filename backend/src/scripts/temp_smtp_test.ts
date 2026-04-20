import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

// Try sending email to see actual SMTP errors
async function testSMTP() {
    console.log("Starting SMTP Test...");

    const host = process.env.ELASTIC_EMAIL_SMTP_HOST || 'smtp.elasticemail.com';
    const port = Number(process.env.ELASTIC_EMAIL_SMTP_PORT) || 2525;
    const user = process.env.ELASTIC_EMAIL_SMTP_USER || 'noreply@sharkfunded.com';
    const pass = process.env.ELASTIC_EMAIL_SMTP_PASS || 'C26AD1121F3DDAFCE8CC1BD6F0F97F766132';

    console.log(`Connecting to ${host}:${port} as ${user}...`);

    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: false, // Port 587 uses STARTTLS
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false
        },
        logger: true, // Enable built-in logger
        debug: true   // Include SMTP traffic in logs
    });

    try {
        console.log("Verifying connection configuration...");
        await transporter.verify();
        console.log("✅ Server is ready to take our messages");

        console.log("Attempting to send a test message...");
        const info = await transporter.sendMail({
            from: `"SharkFunded Test" <${process.env.ELASTIC_EMAIL_FROM || 'noreply@sharkfunded.com'}>`,
            to: "Kunthuwealth3004@gmail.com",
            subject: "Debug Test Email from Nodemailer",
            text: "This is a direct test from the server to check SMTP delivery.",
            html: "<b>This is a direct test from the server to check SMTP delivery.</b>"
        });

        console.log("✅ Message sent: %s", info.messageId);
    } catch (error) {
        console.error("❌ SMTP Error occurred:");
        console.error(error);
    }
}

testSMTP();
