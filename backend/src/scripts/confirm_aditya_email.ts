
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'adityasingh.feb10@gmail.com';
    const userId = '85f0bfd4-4847-4198-94b4-4612d101199a';

    console.log(`Confirming Email for User: ${email} (${userId})`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
    );

    if (error) {
        console.error("❌ Error confirming email:", error.message);
    } else {
        console.log("✅ Email successfully confirmed!");
        console.log("   - User ID:", data.user.id);
        console.log("   - Confirmed At:", data.user.email_confirmed_at);
    }
}

main();
