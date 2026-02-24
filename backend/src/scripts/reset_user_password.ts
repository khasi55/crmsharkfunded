
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'ss2380536@gmail.com';
    const newPassword = 'Sahil@845986'; // Temporary password

    console.log(` Resetting Dashboard Password for: ${email}`);

    // 1. Get User ID by paginating auth.users
    let user = null;
    let page = 1;

    while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (listError || users.length === 0) break;

        user = users.find(u => u.email === email);
        if (user) break;
        page++;
    }

    if (!user) {
        console.error(" Failed to find user in auth.users:", email);
        return;
    }

    const userId = user.id;

    console.log(` Found User ID: ${userId}`);

    // 2. Update Password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (updateError) {
        console.error(" Failed to update password:", updateError);
    } else {
        console.log(` Password successfully reset to: ${newPassword}`);
    }
}

main();
