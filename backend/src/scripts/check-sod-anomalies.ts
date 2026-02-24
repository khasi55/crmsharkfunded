import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnomalies() {
    const { data: challenges } = await supabase.from('challenges').select('login, initial_balance, current_equity, start_of_day_equity, status').eq('status', 'active');

    if (challenges) {
        for (const c of challenges) {
            const sod = Number(c.start_of_day_equity || c.initial_balance);
            const eq = Number(c.current_equity || c.initial_balance);
            const dailyNet = eq - sod;
            const dailyLoss = dailyNet < 0 ? Math.abs(dailyNet) : 0;

            if (dailyLoss > 500) {
                console.log(`⚠️ Login: ${c.login} | Initial: ${c.initial_balance} | Equity: ${eq} | SOD: ${sod} | Computed Daily Loss: ${dailyLoss}`);
            }
        }
    }
}
checkAnomalies();
