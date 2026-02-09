
import { supabase } from '../lib/supabase';

async function checkAndClearViolations() {
    const challengeId = '5073294e-66ee-45c1-ade0-3992a6431109'; // ID for 900909491276
    console.log(`🔍 Checking violations for account 900909491276...`);

    // Check risk flags
    const { data: flags, error: flagsError } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('challenge_id', challengeId);

    if (flagsError) {
        console.error('❌ Error fetching flags:', flagsError);
        return;
    }

    console.log(`\nFound ${flags?.length || 0} risk flags in advanced_risk_flags table.`);

    if (flags && flags.length > 0) {
        flags.forEach(f => {
            console.log(`  - ${f.flag_type} (Severity: ${f.severity}) - Ticket: ${f.trade_ticket}`);
        });

        console.log('\n🧹 Clearing risk flags...');
        const { error: deleteError, count } = await supabase
            .from('advanced_risk_flags')
            .delete({ count: 'exact' })
            .eq('challenge_id', challengeId);

        if (deleteError) {
            console.error('❌ Delete failed:', deleteError);
        } else {
            console.log(`✅ Deleted ${count} risk flags.`);
        }
    }

    // Check risk violations
    const { data: violations, error: violError } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challengeId);

    if (violError) {
        console.error('❌ Error fetching violations:', violError);
        return;
    }

    console.log(`\nFound ${violations?.length || 0} violations in risk_violations table.`);

    if (violations && violations.length > 0) {
        violations.forEach(v => {
            console.log(`  - ${v.violation_type}`);
        });
    }

    console.log('\n✅ Account 900909491276 status check complete.');
}

checkAndClearViolations();
