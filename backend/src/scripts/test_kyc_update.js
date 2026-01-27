
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    const didit_session_id = '7ee26f74-3a42-45d9-99c4-915fd524b3bf';
    const status = 'approved';

    console.log(`Testing update for session: ${didit_session_id}`);

    const updateData = {
        updated_at: new Date().toISOString(),
        status: status,
        completed_at: new Date().toISOString()
    };

    try {
        console.log('Sending update to Supabase...');
        const { data, error } = await supabase
            .from('kyc_sessions')
            .update(updateData)
            .eq('didit_session_id', didit_session_id)
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase Error:', error);
        } else {
            console.log('✅ Success:', data);
        }
    } catch (e) {
        console.error('❌ Exception:', e);
    }
}

testUpdate();
