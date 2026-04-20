import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBreaches() {
    const today = new Date().toISOString().split('T')[0];
    const startOfToday = `${today}T00:00:00.000Z`;

    console.log(`🔍 Checking breaches for today: ${today}`);

    // 1. Check challenges status
    const { data: breachedChallenges, error: cError } = await supabase
        .from('challenges')
        .select('id, login, status, updated_at')
        .eq('status', 'breached')
        .gte('updated_at', startOfToday);

    if (cError) {
        console.error('Error fetching challenges:', cError.message);
    } else {
        console.log(`📊 Accounts found with 'breached' status updated today: ${breachedChallenges?.length || 0}`);
        breachedChallenges?.forEach(c => {
            console.log(`   - Login: ${c.login} (Updated: ${c.updated_at})`);
        });
    }

    // 2. Check risk_violations
    const { data: violations, error: vError } = await supabase
        .from('risk_violations')
        .select('*')
        .gte('created_at', startOfToday);

    if (vError) {
        console.error('Error fetching risk_violations:', vError.message);
    } else {
        console.log(`🚦 Records in 'risk_violations' today: ${violations?.length || 0}`);
    }

    // 3. Check advanced_risk_flags
    const { data: flags, error: fError } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .gte('created_at', startOfToday);

    if (fError) {
        console.error('Error fetching advanced_risk_flags:', fError.message);
    } else {
        console.log(`🚩 Records in 'advanced_risk_flags' today: ${flags?.length || 0}`);
    }

    // 4. Check core_risk_violations
    const { data: core, error: ceError } = await supabase
        .from('core_risk_violations')
        .select('*')
        .gte('created_at', startOfToday);

    if (ceError) {
        console.error('Error fetching core_risk_violations:', ceError.message);
    } else {
        console.log(`💀 Records in 'core_risk_violations' today: ${core?.length || 0}`);
    }
}

checkBreaches().catch(console.error);
