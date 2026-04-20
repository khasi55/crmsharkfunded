import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function findUser() {
    const targetEmail = 'saquibmohammad890@gmail.com';
    const similarEmail = 'mohammadsakhib890@gmail.com';

    console.log(`🔍 Searching for users in auth.users...`);

    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error.message);
        return;
    }

    const matches = users.users.filter(u =>
        u.email?.toLowerCase().includes('890') ||
        u.email?.toLowerCase().includes('saquib') ||
        u.email?.toLowerCase().includes('sakhib')
    );

    console.log(`Found ${matches.length} similar users:`);
    matches.forEach(u => {
        console.log(`- [${u.id}] ${u.email} (Confirmed: ${!!u.email_confirmed_at})`);
    });

    const exactMatch = users.users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (exactMatch) {
        console.log(`\n✅ EXACT MATCH FOUND: [${exactMatch.id}] ${exactMatch.email}`);
    } else {
        console.log(`\n❌ NO EXACT MATCH FOUND for ${targetEmail}`);
    }
}

findUser();
