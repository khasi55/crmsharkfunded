import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function findUserByEmail() {
    const email = 'saquibmohammad890@gmail.com';
    console.log(`🔍 Searching for exact email in auth.users: ${email}`);

    // listUsers doesn't support filtering well via API, so we list and find
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error.message);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
        console.log('✅ Auth user found by email:', {
            id: user.id,
            email: user.email,
            confirmed_at: user.email_confirmed_at
        });
    } else {
        console.log('❌ Auth user NOT FOUND by email in the retrieved list.');
    }
}

findUserByEmail();
