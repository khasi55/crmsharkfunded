import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const email = 'dax2712@gmail.com';
    const newPassword = 'Dax@00';

    console.log(`Resetting Dashboard Password for: ${email}`);

    let page = 1;
    let foundUser = null;

    while (true) {
        console.log(`Fetching page ${page}...`);
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

        if (error) {
            console.error("Failed to list users:", error);
            return;
        }

        if (users.length === 0) {
            break;
        }

        const user = users.find(u => u.email === email);
        if (user) {
            foundUser = user;
            break;
        }
        page++;
    }

    if (!foundUser) {
        console.error(`User not found: ${email}`);
        return;
    }

    console.log(`Found User ID: ${foundUser.id}`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
        foundUser.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error("Failed to update password:", updateError);
    } else {
        console.log(`Password successfully reset to: ${newPassword}`);
    }
}

main();
