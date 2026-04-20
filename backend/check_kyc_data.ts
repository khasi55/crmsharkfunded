
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKYC() {
    console.log('Checking KYC sessions...');
    const { data: sessions, error: sError } = await supabase
        .from('kyc_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (sError) {
        console.error('Error fetching sessions:', sError);
        return;
    }

    console.log(`Found ${sessions.length} sessions.`);
    for (const session of sessions) {
        console.log(`Session ID: ${session.id}`);
        console.log(`User ID: ${session.user_id}`);
        console.log(`Status: ${session.status}`);
        console.log(`Document Type: ${session.document_type}`);
        console.log(`First Name: ${session.first_name}, Last Name: ${session.last_name}`);
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user_id)
            .single();
        
        console.log(`Profile: ${profile ? `${profile.full_name} (${profile.email})` : 'NOT FOUND'}`);
        console.log('---');
    }
}

checkKYC();
