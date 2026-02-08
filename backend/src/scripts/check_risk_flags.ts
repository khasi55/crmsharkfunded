
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFlags() {
    console.log("🔍 Checking advanced_risk_flags table...");

    const { count, error: countError } = await supabase
        .from('advanced_risk_flags')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("❌ Error counting flags:", countError.message);
    } else {
        console.log(`✅ Total Rows: ${count}`);
    }

    const { data, error } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Error fetching flags:", error.message);
    } else {
        console.log("📝 Latest 5 Flags:");
        console.table(data);
    }
}

checkFlags();
