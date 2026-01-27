
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { EmailService } from '../services/email-service';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TARGETS = [
    { email: 'ns613272@gmail.com', login: null }, // Try email lookup for this one
    { email: 'stsingh131@gmail.com', login: 889224396 },
    { email: 'anand.pips07@gmail.com', login: 889224395 }
];

async function resendCredentials() {
    console.log(" Starting Manual Email Resend (By Login/Email)...");

    for (const target of TARGETS) {
        console.log(`\n---------------------------------------------------`);
        console.log(` Processing: ${target.email} (Login: ${target.login || 'Auto'})`);

        let challenge: any = null;
        let user: any = null;

        // Strategy 1: Lookup by Login (Most Accurate for "Admin Assigned")
        if (target.login) {
            const { data, error } = await supabase
                .from('challenges')
                .select('*')
                .eq('login', target.login)
                .single();

            if (data) {
                console.log(`Found Challenge via Login: ${data.id}`);
                challenge = data;
            } else {
                console.error(`Challenge lookup by login failed: ${error?.message}`);
            }
        }

        // Strategy 2: Lookup by User ID (if we have auth user but no login provided)
        if (!challenge) {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            user = users.find(u => u.email === target.email);

            if (user) {
                console.log(` Found Auth User: ${user.id}`);
                // Find challenge for this user
                const { data: cData } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (cData) challenge = cData;
            }
        }

        if (!challenge) {
            console.error(" Could not find any challenge record. Skipping.");
            continue;
        }

        // 3. Send Email
        try {
            const emailToSend = target.email; // Trust the request email
            const name = "Trader"; // Generic if user not found

            // DB Column is 'master_password', not 'password'
            const password = challenge.master_password || challenge.password;

            if (password) {
                console.log(` Sending Credentials to ${emailToSend}...`);
                await EmailService.sendAccountCredentials(
                    emailToSend,
                    name,
                    String(challenge.login),
                    password,
                    challenge.server || 'SharkFunded-Demo',
                    challenge.investor_password // This matches DB column
                );
                console.log(` Email Sent successfully!`);
            } else {
                console.warn(` No password found in DB for ${challenge.login}. Cannot send credentials.`);
            }

        } catch (e: any) {
            console.error(` Failed to send email: ${e.message}`);
        }
    }
}

resendCredentials();
