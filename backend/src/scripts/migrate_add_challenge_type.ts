import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔄 Running migration to add challenge_type to mt5_risk_groups...\n');

    try {
        // Step 1: Add challenge_type column
        console.log('Step 1: Adding challenge_type column...');
        const { error: addColumnError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE mt5_risk_groups 
                ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT 'Phase 1';
            `
        });

        if (addColumnError) {
            console.log('⚠️  Column might already exist:', addColumnError.message);
        } else {
            console.log('✅ Added challenge_type column');
        }

        // Step 2: Update existing records
        console.log('\nStep 2: Updating existing records to Phase 1...');
        const { error: updateError } = await supabase
            .from('mt5_risk_groups')
            .update({ challenge_type: 'Phase 1' })
            .is('challenge_type', null);

        if (updateError && !updateError.message.includes('column')) {
            console.error('❌ Update error:', updateError);
        } else {
            console.log('✅ Updated existing records');
        }

        // Step 3: Insert phase-specific configurations
        console.log('\nStep 3: Inserting phase-specific configurations...');

        const phaseConfigs = [
            // Lite 2-Step configurations
            { group_name: 'demo\\SF\\2', challenge_type: 'Phase 1', max_drawdown_percent: 6.0, daily_drawdown_percent: 3.0, profit_target_percent: 6.0 },
            { group_name: 'demo\\SF\\2', challenge_type: 'Phase 2', max_drawdown_percent: 6.0, daily_drawdown_percent: 3.0, profit_target_percent: 6.0 },
            { group_name: 'demo\\SF\\2', challenge_type: 'funded', max_drawdown_percent: 6.0, daily_drawdown_percent: 3.0, profit_target_percent: 0.0 },

            // Lite 1-Step configurations
            { group_name: 'demo\\SF\\1', challenge_type: 'Phase 1', max_drawdown_percent: 6.0, daily_drawdown_percent: 3.0, profit_target_percent: 8.0 },
            { group_name: 'demo\\SF\\1', challenge_type: 'funded', max_drawdown_percent: 6.0, daily_drawdown_percent: 3.0, profit_target_percent: 0.0 },

            // Lite Instant
            { group_name: 'demo\\SF\\0', challenge_type: 'instant', max_drawdown_percent: 8.0, daily_drawdown_percent: 4.0, profit_target_percent: 0.0 },

            // Prime 2-Step configurations
            { group_name: 'demo\\S\\2-SF', challenge_type: 'Phase 1', max_drawdown_percent: 8.0, daily_drawdown_percent: 4.0, profit_target_percent: 6.0 },
            { group_name: 'demo\\S\\2-SF', challenge_type: 'Phase 2', max_drawdown_percent: 8.0, daily_drawdown_percent: 4.0, profit_target_percent: 6.0 },
            { group_name: 'demo\\S\\2-SF', challenge_type: 'funded', max_drawdown_percent: 10.0, daily_drawdown_percent: 5.0, profit_target_percent: 0.0 },

            // Prime 1-Step configurations
            { group_name: 'demo\\S\\1-SF', challenge_type: 'Phase 1', max_drawdown_percent: 6.0, daily_drawdown_percent: 4.0, profit_target_percent: 8.0 },
            { group_name: 'demo\\S\\1-SF', challenge_type: 'funded', max_drawdown_percent: 10.0, daily_drawdown_percent: 5.0, profit_target_percent: 0.0 },

            // Prime Instant
            { group_name: 'demo\\S\\0-SF', challenge_type: 'instant', max_drawdown_percent: 8.0, daily_drawdown_percent: 4.0, profit_target_percent: 0.0 },

            // Funded Live
            { group_name: 'SF Funded Live', challenge_type: 'funded', max_drawdown_percent: 10.0, daily_drawdown_percent: 5.0, profit_target_percent: 0.0 },

            // Competition
            { group_name: 'demo\\SF\\0-Demo\\comp', challenge_type: 'competition', max_drawdown_percent: 10.0, daily_drawdown_percent: 5.0, profit_target_percent: 0.0 },
        ];

        for (const config of phaseConfigs) {
            // Check if already exists
            const { data: existing } = await supabase
                .from('mt5_risk_groups')
                .select('id')
                .eq('group_name', config.group_name)
                .eq('challenge_type', config.challenge_type)
                .maybeSingle();

            if (!existing) {
                const { error: insertError } = await supabase
                    .from('mt5_risk_groups')
                    .insert(config);

                if (insertError) {
                    console.log(`⚠️  ${config.group_name} (${config.challenge_type}): ${insertError.message}`);
                } else {
                    console.log(`✅ ${config.group_name} (${config.challenge_type}): Profit Target = ${config.profit_target_percent}%`);
                }
            } else {
                console.log(`⏭️  ${config.group_name} (${config.challenge_type}): Already exists`);
            }
        }

        console.log('\n🎉 Migration complete!');
        console.log('\n📝 Summary:');
        console.log('- Added challenge_type column to mt5_risk_groups');
        console.log('- Inserted phase-specific profit target configurations');
        console.log('- You can now configure different profit targets for Phase 1, Phase 2, and Funded stages');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
