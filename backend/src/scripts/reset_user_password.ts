
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'bnjena9178@gmail.com';
    const newPassword = 'Sharkfunded123!'; // Temporary password

    console.log(` Resetting Dashboard Password for: ${email}`);

    // 1. Get User ID (Fetch more users to handle pagination limits)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) {
        console.error(" Failed to list users:", listError);
        return;
    }

    console.log("Available Users:", users.map(u => u.email));

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(` User not found: ${email}`);
        return;
    }

    console.log(` Found User ID: ${user.id}`);

    // 2. Update Password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error(" Failed to update password:", updateError);
    } else {
        console.log(` Password successfully reset to: ${newPassword}`);
    }
}

main();
