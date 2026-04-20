import { supabase } from '../lib/supabase';

async function seedDirectFundedRule() {
    console.log('--- Seeding Direct Funded Rule ---');

    const rule = {
        challenge_type: 'direct_funded',
        profit_target_percent: 0, // Direct funded often has no target for phase
        daily_drawdown_percent: 4,
        max_drawdown_percent: 10,
        description: 'Direct Funded Account'
    };

    const { data: existing } = await supabase
        .from('challenge_type_rules')
        .select('challenge_type')
        .eq('challenge_type', 'direct_funded')
        .maybeSingle();

    if (existing) {
        console.log('✅ Direct Funded rule already exists. Skipping seed.');
        return;
    }

    const { error } = await supabase
        .from('challenge_type_rules')
        .insert(rule);

    if (error) {
        console.error('❌ Error seeding Direct Funded rule:', error.message);
    } else {
        console.log('✅ Direct Funded rule seeded successfully.');
    }
}

seedDirectFundedRule();
