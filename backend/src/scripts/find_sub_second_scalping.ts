
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findSubSecondScalping() {
    console.log("🔍 Searching for any sub-second or 0-second tick scalping violations...");

    const { data: violations, error } = await supabase
        .from('advanced_risk_flags')
        .select('id, description, trade_ticket')
        .eq('flag_type', 'tick_scalping');

    if (error) {
        console.error("❌ Error fetching violations:", error);
        return;
    }

    const subSecond = violations.filter(v => {
        const match = v.description.match(/Duration ([\d\.]+)s/);
        if (match) {
            const duration = parseFloat(match[1]);
            return duration < 1.0;
        }
        return false;
    });

    if (subSecond.length > 0) {
        console.log(`⚠️  Found ${subSecond.length} violations with duration < 1s.`);
        subSecond.slice(0, 5).forEach(v => console.log(`- ID: ${v.id}, Ticket: ${v.trade_ticket}, Desc: ${v.description}`));
    } else {
        console.log("✅ No violations with duration < 1s found.");
    }

    const nonStandard = violations.filter(v => !v.description.includes('Duration'));
    if (nonStandard.length > 0) {
        console.log(`ℹ️ Found ${nonStandard.length} non-standard tick scalping descriptions.`);
        nonStandard.slice(0, 5).forEach(v => console.log(`- ${v.description}`));
    }
}

findSubSecondScalping().catch(console.error);
