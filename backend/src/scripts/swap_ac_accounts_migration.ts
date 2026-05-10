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

async function swapAcLogins() {
    const csvPath = '/Users/viswanathreddy/Desktop/Desktop - VISWANATH’s MacBook Pro/Sharkfunded/SharkfundedCRM/ac.csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '' && l.split(',')[0].trim() !== 'Auro');
    
    // Skip header: Auro,,Xylo Markets Ltd
    const accountPairs = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const oldLogin = parts[0];
        const newLogin = parts[2];
        const group = parts[1].replace(';', ''); 
        return { oldLogin, newLogin, group };
    }).filter(p => p.oldLogin && p.newLogin);

    console.log(`Starting swap for matched ac.xlsx accounts...`);
    let successCount = 0;
    let errorCount = 0;

    for (const { oldLogin, newLogin, group } of accountPairs) {
        // 1. Find the challenge ID for this old login
        const { data: challenge, error: findError } = await supabase
            .from('challenges')
            .select('id')
            .eq('login', oldLogin)
            .maybeSingle();

        if (findError) {
            console.error(`  - Error finding challenge for login ${oldLogin}:`, findError.message);
            errorCount++;
            continue;
        }

        if (!challenge) {
            // This is expected for the 28 missing accounts
            continue;
        }

        const challengeId = challenge.id;
        console.log(`Swapping ${oldLogin} -> ${newLogin} (ID: ${challengeId})`);

        // 2. Update challenges table
        const { error: updateChallengeError } = await supabase
            .from('challenges')
            .update({ 
                login: newLogin,
                group: group 
            })
            .eq('id', challengeId);

        if (updateChallengeError) {
            console.error(`  - Failed to update challenge ${challengeId}:`, updateChallengeError.message);
            errorCount++;
            continue;
        }

        // 3. Update payout_requests metadata
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

swapAcLogins();
