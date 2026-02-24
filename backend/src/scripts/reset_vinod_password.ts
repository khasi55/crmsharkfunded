import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load env from multiple possible locations to be 100% sure
const possibleEnvPaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend/.env'),
    '.env'
];

for (const envPath of possibleEnvPaths) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(`Missing Supabase URL or Key`);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
    const email = 'vinodkumar321173@gmail.com'; // Lowercase for safety 
    const newPassword = 'Vinod@1199';

    console.log(`Searching for user with email: ${email}`);

    // Query across all users
    let foundUser = null;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

        if (listError) {
            console.error('Error fetching users:', listError);
            return;
        }

        if (!users || users.length === 0) {
            hasMore = false;
            break;
        }

        const match = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (match) {
            foundUser = match;
            break;
        }

        page++;
    }

    if (!foundUser) {
        console.error(`User not found with email: ${email}`);
        return;
    }

    console.log(`Found user: ${foundUser.id}. Updating password...`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
        foundUser.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error('Error updating password:', updateError);
        return;
    }

    console.log(`✅ Successfully updated password for ${email}`);
}

resetPassword();
