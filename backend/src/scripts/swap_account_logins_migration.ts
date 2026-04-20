import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/crmsharkfunded/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function swapLogins() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/New1 (1).csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    
    // Skip header: Auro,Ocean Markets,
    const accountPairs = lines.slice(1).map(line => {
        const [oldLogin, newLogin] = line.split(',').map(s => s.trim());
        return { oldLogin: Number(oldLogin), newLogin: Number(newLogin) };
    });

    console.log(`Starting swap for ${accountPairs.length} accounts...`);
    let successCount = 0;
    let errorCount = 0;

    for (const { oldLogin, newLogin } of accountPairs) {
        if (isNaN(oldLogin) || isNaN(newLogin)) continue;

        console.log(`Swapping ${oldLogin} -> ${newLogin}`);

        // 1. Find the challenge ID for this old login
        const { data: challenge, error: findError } = await supabase
            .from('challenges')
            .select('id')
            .eq('login', oldLogin)
            .maybeSingle();

        if (findError || !challenge) {
            console.error(`  - Failed to find challenge for login ${oldLogin}:`, findError?.message || 'Not found');
            errorCount++;
            continue;
        }

        const challengeId = challenge.id;

        // 2. Update challenges table
        const { error: updateChallengeError } = await supabase
            .from('challenges')
            .update({ login: newLogin })
            .eq('id', challengeId);

        if (updateChallengeError) {
            console.error(`  - Failed to update challenge ${challengeId}:`, updateChallengeError.message);
            errorCount++;
            continue;
        }

        // 3. Update payout_requests metadata
        // We fetch all payouts for this challenge_id and update their metadata
        const { data: payouts, error: fetchPayoutsError } = await supabase
            .from('payout_requests')
            .select('id, metadata')
            .filter('metadata->>challenge_id', 'eq', challengeId);

        if (fetchPayoutsError) {
            console.error(`  - Error fetching payouts for ${challengeId}:`, fetchPayoutsError.message);
        } else if (payouts && payouts.length > 0) {
            console.log(`  - Updating metadata for ${payouts.length} payout requests...`);
            for (const payout of payouts) {
                const newMetadata = { ...payout.metadata, mt5_login: newLogin };
                const { error: updatePayoutError } = await supabase
                    .from('payout_requests')
                    .update({ metadata: newMetadata })
                    .eq('id', payout.id);
                
                if (updatePayoutError) {
                    console.error(`    - Failed to update payout ${payout.id}:`, updatePayoutError.message);
                }
            }
        }

        console.log(`  - Successfully swapped ${oldLogin} to ${newLogin}`);
        successCount++;
    }

    console.log(`\nMigration completed.`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

swapLogins();
