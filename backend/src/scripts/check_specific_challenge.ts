import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChallenge() {
    const login = 900909492674;
    const orderId = 'SF1771007932725PS9S5K2OW';

    console.log(`🔍 Checking challenge for login ${login} OR order ID ${orderId}...`);

    const { data: byLogin, error: err1 } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login);

    const { data: byOrder, error: err2 } = await supabase
        .from('challenges')
        .select('*')
    const { data: byParentOrder } = await supabase
        .from('challenges')
        .select('*')
        .contains('metadata', { parent_order_id: orderId });

    const { data: recent } = await supabase
        .from('challenges')
        .select('id, login, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('Result by Login:', JSON.stringify(byLogin, null, 2));
    console.log('Result by Parent Order ID:', JSON.stringify(byParentOrder, null, 2));
    console.log('Recent Challenges:', JSON.stringify(recent, null, 2));
}

checkChallenge();
