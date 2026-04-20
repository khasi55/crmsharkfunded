import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function findInAuth() {
    const target = 'saquibmohammad890@gmail.com'.toLowerCase();

    let page = 1;
    let found = false;

    while (true) {
        console.log(`Checking page ${page}...`);
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 100
        });

        if (error || !users || users.length === 0) break;

        const match = users.find(u => u.email?.toLowerCase() === target);
        if (match) {
            console.log(`✅ FOUND: [${match.id}] ${match.email} (Confirmed: ${!!match.email_confirmed_at})`);
            found = true;
            break;
        }

        if (users.length < 100) break;
        page++;
    }

    if (!found) {
        console.log('❌ Not found in auth.users after paging.');
    }
}

findInAuth();
