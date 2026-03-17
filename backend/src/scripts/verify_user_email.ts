import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = 'andrewdoraisamy6@gmail.com';
    const userId = '24c601dd-63e2-4dad-9321-7e9147d27cd2';

    console.log(`Verifying email for: ${email} (ID: ${userId})`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
    );

    if (error) {
        console.error("Failed to verify email:", error);
    } else {
        console.log(`✅ Email successfully verified for: ${data.user.email}`);
        console.log(`Confirmed At: ${data.user.confirmed_at}`);
    }
}

main();
