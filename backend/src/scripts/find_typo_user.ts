import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function searchBoth() {
    const typoEmail = 'salmankhan788812@gmali.com';
    const correctEmail = 'salmankhan788812@gmail.com';
    
    console.log(`Searching for '${typoEmail}' and '${correctEmail}'...`);
    
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error("Error listing users:", authError);
    } else {
        const typoUser = users.find(u => u.email?.toLowerCase() === typoEmail.toLowerCase());
        const correctUser = users.find(u => u.email?.toLowerCase() === correctEmail.toLowerCase());
        
        if (typoUser) console.log("Found TYPO in Auth:", typoUser.id, typoUser.email);
        if (correctUser) console.log("Found CORRECT in Auth:", correctUser.id, correctUser.email);
    }

    // Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${typoEmail},email.eq.${correctEmail}`);
    
    if (profileError) console.error("Profiles error:", profileError.message);
    else {
        profiles.forEach(p => console.log(`Found in profiles: ${p.id} ${p.email}`));
    }
}

searchBoth();
