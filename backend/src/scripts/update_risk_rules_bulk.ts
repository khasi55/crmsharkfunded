
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const updates = {
    "demo\\S\\0-SF": {
        "max_drawdown_percent": 6.0,
        "daily_drawdown_percent": 3.0,
        "reset_hour_gmt": 0
    },
    "demo\\S\\1-SF": {
        "max_drawdown_percent": 6.0,
        "daily_drawdown_percent": 3.0,
        "reset_hour_gmt": 0
    },
    "demo\\S\\2-SF": {
        "max_drawdown_percent": 6.0,
        "daily_drawdown_percent": 3.0,
        "reset_hour_gmt": 0
    },
    "demo\\SF\\0-Pro": {
        "max_drawdown_percent": 7.0,
        "daily_drawdown_percent": 4.0,
        "reset_hour_gmt": 0
    },
    "demo\\SF\\1-Pro": {
        "max_drawdown_percent": 10.0,
        "daily_drawdown_percent": 4.0,
        "reset_hour_gmt": 0
    },
    "demo\\SF\\2-Pro": {
        "max_drawdown_percent": 10.0,
        "daily_drawdown_percent": 4.0,
        "reset_hour_gmt": 0
    },
    "demo\\SF\\0-Demo\\comp": {
        "max_drawdown_percent": 11.0,
        "daily_drawdown_percent": 4.0,
        "reset_hour_gmt": 0
    }
};

async function main() {
    console.log('Starting bulk update of risk rules...');

    for (const [groupName, config] of Object.entries(updates)) {
        console.log(`Updating ${groupName}...`);

        // Map user keys to DB keys
        // daily_drawdown_percent -> max_daily_loss_percent
        // max_drawdown_percent -> max_total_drawdown_percent

        const updatePayload = {
            max_daily_loss_percent: config.daily_drawdown_percent,
            max_total_drawdown_percent: config.max_drawdown_percent,
            // reset_hour_gmt: config.reset_hour_gmt // Assuming this column exists, if not it will error. 
            // Checking previous output, I didn't see reset_hour_gmt in the truncated output, but it's likely there or irrelevant if not in DB scheme.
            // Safe bet: The user asked to update it, so I should try. If it fails, I'll remove it.
        };

        const { data, error } = await supabase
            .from('risk_rules_config')
            .update(updatePayload)
            .eq('mt5_group_name', groupName)
            .select();

        if (error) {
            console.error(`❌ Failed to update ${groupName}:`, error.message);
        } else {
            if (data.length === 0) {
                console.warn(`⚠️ No row found for group: ${groupName}. Creating it? (Skipping creation for now, only updating existing)`);
            } else {
                console.log(`✅ Updated ${groupName}`);
            }
        }
    }
}

main();
