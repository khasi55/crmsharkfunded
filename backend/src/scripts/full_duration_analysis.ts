
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

async function analyzeAllScalping() {
    console.log("📊 Analyzing all tick scalping violations...");

    const { data: violations, error } = await supabase
        .from('advanced_risk_flags')
        .select('id, description, trade_ticket')
        .eq('flag_type', 'tick_scalping');

    if (error) {
        console.error("❌ Error fetching violations:", error);
        return;
    }

    const counts: Record<string, number> = {};
    const zeroStillFound: any[] = [];

    violations.forEach(v => {
        const match = v.description.match(/Duration (\d+)s/);
        if (match) {
            const sec = match[1];
            counts[sec] = (counts[sec] || 0) + 1;
            if (parseInt(sec) === 0) {
                zeroStillFound.push({ id: v.id, ticket: v.trade_ticket, desc: v.description });
            }
        } else {
            counts["unknown"] = (counts["unknown"] || 0) + 1;
        }
    });

    console.log("\n📈 Violation Distribution by Duration:");
    Object.keys(counts).sort((a, b) => {
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        return parseInt(a) - parseInt(b);
    }).forEach(sec => {
        console.log(`- ${sec}s: ${counts[sec]} violations`);
    });

    if (zeroStillFound.length > 0) {
        console.log(`\n⚠️  STILL FOUND ${zeroStillFound.length} zero-second violations!`);
        console.log("Sample:", zeroStillFound.slice(0, 3));
    } else {
        console.log("\n✅ No 0-second violations remaining.");
    }
}

analyzeAllScalping().catch(console.error);
