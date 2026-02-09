
import { supabase } from '../lib/supabase';

async function clearRiskFlags() {
    const challengeId = '5073294e-66ee-45c1-ade0-3992a6431109'; // ID for 900909491276
    console.log(`🧹 Clearing risk flags for challenge ${challengeId}...`);

    const { error, count } = await supabase
        .from('advanced_risk_flags')
        .delete({ count: 'exact' })
        .eq('challenge_id', challengeId);

    if (error) {
        console.error('❌ Error clearing flags:', error);
    } else {
        console.log(`✅ Successfully deleted ${count} risk flags.`);
    }
}

clearRiskFlags();
