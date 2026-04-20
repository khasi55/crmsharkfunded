import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function diagnose() {
    console.log('--- Diagnosis ---');
    
    const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log(`Total profiles: ${profileCount}`);
    
    const { data: sessions, error: sError } = await supabase
        .from('kyc_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
    console.log(`Latest 10 KYC sessions fetched. Errors: ${sError ? JSON.stringify(sError) : 'None'}`);
    
    if (sessions) {
        for (const s of sessions) {
            const { data: profile } = await supabase.from('profiles').select('id, email, full_name').eq('id', s.user_id).single();
            console.log(`Session ID: ${s.id}, User ID: ${s.user_id}, Profile Found: ${!!profile}, Email: ${profile?.email || 'N/A'}`);
        }
    }
}

diagnose();
