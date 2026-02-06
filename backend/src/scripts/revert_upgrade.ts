import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function revertUpgradedAccounts() {
    console.log('🔄 Starting to revert upgraded accounts...\n');

    // First, show which accounts will be reverted
    const { data: upgradedAccounts, error: fetchError } = await supabase
        .from('challenges')
        .select('id, login, challenge_type, status, upgraded_to, created_at')
        .eq('status', 'upgraded')
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error('Error fetching upgraded accounts:', fetchError);
        process.exit(1);
    }

    if (!upgradedAccounts || upgradedAccounts.length === 0) {
        console.log('✅ No upgraded accounts found to revert.');
        process.exit(0);
    }

    console.log(`📊 Found ${upgradedAccounts.length} upgraded account(s):\n`);
    upgradedAccounts.forEach(acc => {
        console.log(`  - Login: ${acc.login} | Type: ${acc.challenge_type} | Upgraded To: ${acc.upgraded_to}`);
    });

    console.log('\n🔧 Reverting all accounts back to "passed" status...\n');

    // Revert all upgraded accounts
    const { data: revertedAccounts, error: updateError } = await supabase
        .from('challenges')
        .update({
            status: 'passed',
            upgraded_to: null
        })
        .eq('status', 'upgraded')
        .select();

    if (updateError) {
        console.error('❌ Error reverting accounts:', updateError);
        process.exit(1);
    }

    console.log(`✅ Successfully reverted ${revertedAccounts?.length || 0} account(s) back to "passed" status!\n`);

    // Show the reverted accounts
    revertedAccounts?.forEach(acc => {
        console.log(`  ✅ ${acc.login} is now "passed" and ready for upgrade testing`);
    });

    console.log('\n✨ Done! You can now test the upgrade flow again.\n');
}

revertUpgradedAccounts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
