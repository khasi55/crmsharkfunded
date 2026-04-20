import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verifyById() {
    const id = '7c2e72f0-3002-4f0f-8e94-aa965078818e';
    const email = 'saquibmohammad890@gmail.com';

    console.log(`🔍 Verifying ${email} (ID: ${id})...`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        id,
        { email_confirm: true }
    );

    if (error) {
        console.error("❌ Failed to verify email:", error.message);
    } else {
        console.log(`✅ SUCCESSFULLY VERIFIED: ${data.user.email}`);
        console.log(`Confirmed At: ${data.user.confirmed_at}`);
    }
}

verifyById();
