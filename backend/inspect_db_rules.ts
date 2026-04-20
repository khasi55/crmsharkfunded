import { supabase } from './src/lib/supabase';

async function inspectRules() {
    console.log('--- Inspecting challenge_type_rules ---');
    const { data: rules, error: rulesError } = await supabase
        .from('challenge_type_rules')
        .select('*');

    if (rulesError) {
        console.error('Error fetching challenge_type_rules:', rulesError);
    } else {
        console.table(rules);
    }

    console.log('\n--- Inspecting risk_rules_config ---');
    const { data: config, error: configError } = await supabase
        .from('risk_rules_config')
        .select('*');

    if (configError) {
        if (configError.code === '42P01') {
            console.log('risk_rules_config table does not exist.');
        } else {
            console.error('Error fetching risk_rules_config:', configError);
        }
    } else {
        console.table(config);
    }
}

inspectRules();
