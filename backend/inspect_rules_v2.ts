import { supabase } from './src/lib/supabase';

async function inspectRules() {
    console.log('--- Inspecting challenge_type_rules ---');
    const { data: rules, error: rulesError } = await supabase
        .from('challenge_type_rules')
        .select('*');

    if (rulesError) {
        console.error('Error fetching challenge_type_rules:', rulesError);
    } else {
        rules?.forEach(r => {
            console.log(`Type: ${r.challenge_type}, Daily: ${r.daily_drawdown_percent}, Max: ${r.max_drawdown_percent}, Target: ${r.profit_target_percent}`);
        });
    }
}

inspectRules();
