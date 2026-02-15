
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

async function main() {
    console.log('Verifying risk rules...');

    // Groups to check
    const groups = [
        "demo\\S\\0-SF",
        "demo\\S\\1-SF",
        "demo\\S\\2-SF",
        "demo\\SF\\0-Pro",
        "demo\\SF\\1-Pro",
        "demo\\SF\\2-Pro",
        "demo\\SF\\0-Demo\\comp",
        "SF Funded Live" // Check this one too just in case
    ];

    const { data: riskRules } = await supabase
        .from('risk_rules_config')
        .select('*'); // Select all to check values

    if (riskRules) {
        riskRules.forEach(r => {
            console.log(`\nGroup: "${r.mt5_group_name}"`);
            console.log(`  Max Drawdown %: ${r.max_total_drawdown_percent}`);
            console.log(`  Daily Drawdown %: ${r.max_daily_loss_percent}`);
            console.log(`  Min Duration: ${r.min_trade_duration_seconds}`);
        });

        // Check for missing items
        const foundNames = riskRules.map(r => r.mt5_group_name);
        const missing = groups.filter(g => !foundNames.includes(g));
        if (missing.length > 0) {
            console.log('\n⚠️ MISSING GROUPS from DB:', missing);
        }

    } else {
        console.log('No rules found.');
    }
}

main();
