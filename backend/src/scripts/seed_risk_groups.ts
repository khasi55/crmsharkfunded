
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix path to point to backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedRiskGroups() {
    console.log("🌱 Seeding Risk Groups...");

    // Lite Rules (Standard)
    const ruleInstant = { max: 8.0, daily: 4.0 };
    const rule1Step = { max: 6.0, daily: 4.0 };
    const rule2Step = { max: 8.0, daily: 4.0 };
    const ruleFunded = { max: 10.0, daily: 5.0 };

    const groups = [
        // LITE / STANDARD (demo\S\...)
        { group_name: 'demo\\S\\0-SF', max_drawdown_percent: ruleInstant.max, daily_drawdown_percent: ruleInstant.daily },
        { group_name: 'demo\\S\\1-SF', max_drawdown_percent: rule1Step.max, daily_drawdown_percent: rule1Step.daily },
        { group_name: 'demo\\S\\2-SF', max_drawdown_percent: rule2Step.max, daily_drawdown_percent: rule2Step.daily },

        // PRO (demo\SF\...) - "Pro means Lite" (Same Rules)
        { group_name: 'demo\\SF\\0-Pro', max_drawdown_percent: ruleInstant.max, daily_drawdown_percent: ruleInstant.daily },
        { group_name: 'demo\\SF\\1-Pro', max_drawdown_percent: rule1Step.max, daily_drawdown_percent: rule1Step.daily },
        { group_name: 'demo\\SF\\2-Pro', max_drawdown_percent: rule2Step.max, daily_drawdown_percent: rule2Step.daily },

        // FUNDED LIVE
        { group_name: 'SF Funded Live', max_drawdown_percent: ruleFunded.max, daily_drawdown_percent: ruleFunded.daily },

        // COMPETITION (Default)
        { group_name: 'demo\\SF\\0-Demo\\comp', max_drawdown_percent: 10.0, daily_drawdown_percent: 5.0 },
    ];

    for (const group of groups) {
        // Upsert by group_name
        const { error } = await supabase
            .from('mt5_risk_groups')
            .upsert(group, { onConflict: 'group_name' });

        if (error) {
            console.error(` Failed to seed ${group.group_name}:`, error.message);
        } else {
            console.log(` Seeded ${group.group_name} (Max: ${group.max_drawdown_percent}%, Daily: ${group.daily_drawdown_percent}%)`);
        }
    }
}

seedRiskGroups();
