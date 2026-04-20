
import { supabase } from './src/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const LOGIN = "900909609618";

async function debug() {
    try {
        console.log(`🔍 Checking Challenge for Login: ${LOGIN}`);
        const { data: challenge, error: cError } = await supabase
            .from('challenges')
            .select('id, user_id, status, login')
            .eq('login', LOGIN)
            .single();

        if (cError) throw cError;
        if (!challenge) {
            console.log('❌ Challenge not found');
            return;
        }

        console.log(`✅ Challenge ID: ${challenge.id} | Status: ${challenge.status}`);

        console.log('🔍 Checking Risk Violations...');
        const { data: hard, error: hError } = await supabase
            .from('risk_violations')
            .select('*')
            .eq('challenge_id', challenge.id);

        if (hError) console.error('Error fetching hard:', hError);
        console.log(`Found ${hard?.length || 0} Hard Violations:`, hard);

        console.log('🔍 Checking Advanced Risk Flags...');
        const { data: soft, error: sError } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .eq('challenge_id', challenge.id);

        if (sError) console.error('Error fetching soft:', sError);
        console.log(`Found ${soft?.length || 0} Soft Violations:`, soft);

    } catch (err) {
        console.error('Fatal ERROR:', err);
    }
}

debug();
