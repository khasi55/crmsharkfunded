import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function updatePassword(userId: string, password: string) {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: password
    });

    if (error) {
        console.error('Failed to update password:', error);
    } else {
        console.log(`Password updated successfully for ${userId}.`);
    }
}

updatePassword('fabf1b78-a360-4572-b930-5db261874be0', 'Shashank@123');
