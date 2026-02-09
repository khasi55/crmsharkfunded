
import { supabase } from '../lib/supabase';

async function listRiskFlags() {
    const challengeId = '5073294e-66ee-45c1-ade0-3992a6431109'; // ID for 900909491276
    console.log(`🔍 Checking risk flags for challenge ${challengeId}...`);

    const { data: flags, error } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('challenge_id', challengeId);

    if (error) {
        console.error('❌ Error fetching risk flags:', error);
        return;
    }

    if (!flags || flags.length === 0) {
        console.log('ℹ️ No risk flags found.');
        return;
    }

    console.log(`Found ${flags.length} risk flags:`);
    flags.forEach(f => {
        console.log(`- ID: ${f.id} | Type: ${f.flag_type} | Severity: ${f.severity} | Ticket: ${f.trade_ticket}`);
        console.log(`  Description: ${f.description}`);
    });
}

listRiskFlags();
