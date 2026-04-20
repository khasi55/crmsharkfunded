import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAuthUser() {
    const id = '084a96bb-5f3d-4e2c-bd49-f98e681fef42';
    console.log(`🔍 Checking auth user ID: ${id}`);

    const { data: { user }, error } = await supabase.auth.admin.getUserById(id);

    if (error) {
        console.error("Error fetching auth user:", error.message);
        return;
    }

    if (user) {
        console.log('✅ Auth user found:', {
            id: user.id,
            email: user.email,
            confirmed_at: user.email_confirmed_at,
            last_sign_in: user.last_sign_in_at
        });
    } else {
        console.log('❌ Auth user NOT FOUND.');
    }
}

checkAuthUser();
