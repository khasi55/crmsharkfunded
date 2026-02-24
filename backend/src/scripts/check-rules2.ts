import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRules() {
    const { data: rules } = await supabase.from('challenge_type_rules').select('*').eq('challenge_type', 'prime_2_step_phase_1').single();
    if (rules) {
        console.log(`Rules for prime_2_step_phase_1:`);
        console.log(`  Profit Target: ${rules.profit_target_percent}%`);
        console.log(`  Max DD: ${rules.max_drawdown_percent}%`);
        console.log(`  Daily DD: ${rules.daily_drawdown_percent}%`);
    } else {
        console.log(`Rules not found for prime_2_step_phase_1`);
    }
}
checkRules();
