import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const checkEmail = 'akshitfx18@gmail.com';
    console.log(`Checking if email ${checkEmail} exists in profiles...`);

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('email', checkEmail).maybeSingle();
    if (error) {
        console.error("Error checking profile:", error);
    } else if (profile) {
        console.log("Found profile with this email!");
        console.log(profile);
    } else {
        console.log("No profile found with this email.");
    }

    console.log("Checking in auth.users by paging...");
    let page = 1;
    let foundAuthUser = null;
    while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (listError || !users.length) break;
        foundAuthUser = users.find(u => u.email === checkEmail);
        if (foundAuthUser) break;
        page++;
    }

    if (foundAuthUser) {
        console.log("Found user in auth.users!");
        console.log({ id: foundAuthUser.id, email: foundAuthUser.email });
    } else {
        console.log("No user found in auth.users with this email.");
    }
}
main();
