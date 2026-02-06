import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const login = 900909490652;
    console.log(`🔍 Checking logs for Login ${login}...`);

    const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*')
        .or(`message.ilike.%${login}%,details->>login.eq.${login}`)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("❌ Error fetching logs:", error);
        return;
    }

    console.log(`✅ Found ${logs.length} logs:`);
    logs.forEach(log => {
        console.log(`[${log.created_at}] [${log.source}] ${log.level}: ${log.message}`);
        if (log.details) console.log(`   Details:`, JSON.stringify(log.details));
    });
}

checkLogs();
