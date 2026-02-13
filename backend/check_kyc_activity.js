
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKycActivity() {
    console.log('Checking recent KYC session activity...');

    const { data: sessions, error } = await supabase
        .from('kyc_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Last 10 KYC session updates:');
    sessions.forEach(s => {
        console.log(` - User: ${s.user_id}, Status: ${s.status}, Updated: ${s.updated_at}`);
    });
}

checkKycActivity();
