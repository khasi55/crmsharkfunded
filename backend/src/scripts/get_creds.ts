
import { supabase } from '../lib/supabase';

async function getCreds() {
    const login = 900909491276;
    console.log(`🔍 Fetching credentials for login ${login}...`);

    const { data: challenge, error } = await supabase
        .from('challenges')
        .select(`
            login,
            master_password,
            investor_password,
            server,
            user_id
        `)
        .eq('login', login)
        .single();

    if (error || !challenge) {
        console.error('❌ Challenge not found:', error);
        return;
    }

    // specific type for profile data to avoid typescript complaints if needed, or just use any
    const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', challenge.user_id)
        .single();

    console.log('--- Account Credentials ---');
    console.log(`Email: ${profile?.email || 'Unknown'}`);
    console.log(`Login: ${challenge.login}`);
    console.log(`Master Password: ${challenge.master_password}`);
    console.log(`Investor Password: ${challenge.investor_password}`);
    console.log(`Server: ${challenge.server}`);
}

getCreds();
