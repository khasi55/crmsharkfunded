import { supabase } from './src/lib/supabase';

async function testRLS() {
    console.log("Testing insert into system_logs...");
    
    const { data, error } = await supabase.from('system_logs').insert({
        source: 'SecurityLoggerTest',
        level: 'INFO',
        message: 'Testing RLS',
        details: { test: true }
    });

    if (error) {
        console.error("❌ Insert failed:", error);
    } else {
        console.log("✅ Insert succeeded:", data);
    }
}

testRLS().catch(console.error);
