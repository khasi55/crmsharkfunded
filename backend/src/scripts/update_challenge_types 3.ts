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

async function updateChallengeTypes() {
    console.log('🔄 Starting challenge_type migration...\n');

    // Fetch all challenges
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching challenges:', error);
        return;
    }

    console.log(`📊 Found ${challenges?.length} challenges to process\n`);

    let updated = 0;
    let skipped = 0;

    for (const challenge of challenges || []) {
        const group = challenge.group || '';
        const currentType = challenge.challenge_type || '';
        let newType = '';

        // Determine correct challenge_type based on MT5 group
        // --- NEW GROUPS ---
        if (group.includes('OC\\contest\\S\\2')) {
            newType = 'lite_instant';
        } else if (group.includes('OC\\contest\\S\\3')) {
            newType = 'lite_1_step';
        } else if (group.includes('OC\\contest\\S\\4')) {
            // Check if it's already phase_2 or funded
            if (currentType.toLowerCase().includes('phase_2') || currentType.toLowerCase().includes('phase 2')) {
                newType = 'lite_2_step_phase_2';
            } else if (currentType.toLowerCase().includes('funded')) {
                newType = 'lite_funded';
            } else {
                newType = 'lite_2_step_phase_1';
            }
        } else if (group.includes('OC\\contest\\S\\6')) {
            newType = 'prime_instant';
        } else if (group.includes('OC\\contest\\S\\7')) {
            newType = 'prime_1_step';
        } else if (group.includes('OC\\contest\\S\\8')) {
            // Check if it's already phase_2 or funded
            if (currentType.toLowerCase().includes('phase_2') || currentType.toLowerCase().includes('phase 2')) {
                newType = 'prime_2_step_phase_2';
            } else if (currentType.toLowerCase().includes('funded')) {
                newType = 'prime_funded';
            } else {
                newType = 'prime_2_step_phase_1';
            }
        } else if (group.includes('OC\\contest\\S\\1')) {
            newType = 'bolt';
        } else if (group.includes('OC\\contest\\S\\5')) {
            newType = 'binary_options';
        } else if (group.includes('OC\\contest\\S\\9')) {
            newType = 'competition';
        }
        // --- OLD GROUPS (Legacy) ---
        else if (group.includes('\\SF\\0-SF') || group.includes('\\SF\\0')) {
            newType = 'lite_instant';
        } else if (group.includes('\\SF\\1-SF') || group.includes('\\SF\\1')) {
            newType = 'lite_1_step';
        } else if (group.includes('\\SF\\2-SF') || group.includes('\\SF\\2')) {
            // Check if it's already phase_2 or funded
            if (currentType.toLowerCase().includes('phase_2') || currentType.toLowerCase().includes('phase 2')) {
                newType = 'lite_2_step_phase_2';
            } else if (currentType.toLowerCase().includes('funded')) {
                newType = 'lite_funded';
            } else {
                newType = 'lite_2_step_phase_1';
            }
        } else if (group.includes('\\S\\0-SF')) {
            newType = 'prime_instant';
        } else if (group.includes('\\S\\1-SF')) {
            newType = 'prime_1_step';
        } else if (group.includes('\\S\\2-SF')) {
            // Check if it's already phase_2 or funded
            if (currentType.toLowerCase().includes('phase_2') || currentType.toLowerCase().includes('phase 2')) {
                newType = 'prime_2_step_phase_2';
            } else if (currentType.toLowerCase().includes('funded')) {
                newType = 'prime_funded';
            } else {
                newType = 'prime_2_step_phase_1';
            }
        } else {
            // No matching group, skip
            console.log(`⚠️  Skipped: ${challenge.login} - Unknown group: ${group}`);
            skipped++;
            continue;
        }

        // Update if different
        if (newType && newType !== currentType) {
            const { error: updateError } = await supabase
                .from('challenges')
                .update({ challenge_type: newType })
                .eq('id', challenge.id);

            if (updateError) {
                console.error(`❌ Error updating ${challenge.login}:`, updateError.message);
            } else {
                console.log(`✅ Updated: ${challenge.login} | ${currentType} → ${newType} (${group})`);
                updated++;
            }
        } else {
            skipped++;
        }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${challenges?.length}`);
}

updateChallengeTypes()
    .then(() => {
        console.log('\n✅ Migration completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
