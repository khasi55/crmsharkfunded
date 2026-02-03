
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHighValues() {
    console.log('🔍 Searching for high value commissions/balances...');

    // 1. Check Profiles with high total commission
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .gt('total_commission', 10000)
        .order('total_commission', { ascending: false });

    console.log('\n👤 Profiles with > $10,000 Total Commission:');
    profiles?.forEach(p => {
        console.log(`   - ${p.full_name} (${p.email}): ${p.total_commission}`);
    });

    // 2. Check individual earnings > $1000
    const { data: earnings } = await supabase
        .from('affiliate_earnings')
        .select('*')
        .gt('amount', 1000)
        .order('amount', { ascending: false });

    console.log('\n💰 Earnings > $1,000:');
    earnings?.forEach(e => {
        console.log(`   - ID: ${e.id}, Amount: ${e.amount}, User: ${e.referrer_id}`);
    });

    // 3. Specific check for 441600 (ignoring formatting)
    // Could it be 4416.00 and they read it wrong? Or 441,600?
}

checkHighValues();
