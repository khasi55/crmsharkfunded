
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const login = '900909491201';

    const { data: challenge } = await supabase
        .from('challenges')
        .select('id, group')
        .eq('login', login)
        .single();

    console.log('Account Group:', challenge?.group);

    const { data: rules } = await supabase
        .from('risk_rules_config')
        .select('*');

    console.log('All Risk Rules:');
    rules?.forEach(r => {
        console.log(`- ${r.mt5_group_name}: allow_hedging=${r.allow_hedging}, min_duration=${r.min_trade_duration_seconds}s`);
    });

    // Check advanced_risk_flags
    if (challenge) {
        const { data: flags } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('challenge_id', challenge.id);

        console.log('\nAdvanced Risk Flags for Account:');
        if (flags && flags.length > 0) {
            flags.forEach(f => {
                console.log(`- Type: ${f.flag_type}, Ticket: ${f.trade_ticket}, Severity: ${f.severity}`);
                console.log(`  Description: ${f.description}`);
            });
        } else {
            console.log('No advanced risk flags found.');
        }
    }
}

check();
