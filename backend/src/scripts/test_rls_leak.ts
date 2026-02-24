import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function test() {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Global Admin Client
    const supabaseAdmin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    // Temp User setup
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    await supabaseAdmin.auth.admin.createUser({ email: testEmail, password: testPassword, email_confirm: true });

    // Test without modifying the storageKey
    const tempClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: loginErr } = await tempClient.auth.signInWithPassword({ email: testEmail, password: testPassword });
    console.log("Temp client login result:", loginErr?.message || "Success");

    // Wait a brief moment for events to propagate
    await new Promise(r => setTimeout(r, 100));

    // After login, try the admin client - does it still have Service Role privileges?
    // If it was polluted by the user JWT, it will NOT have bypass RLS anymore. 
    console.log("[Test 1] Testing Admin Client after default temp client login...");
    const { data: logs, error: err2 } = await supabaseAdmin.from('system_logs').select('id').limit(1);

    if (err2 && err2.message.includes('row-level security')) {
        console.log("❌ Admin Client POLLUTED! It violates RLS.");
    } else {
        console.log("✅ Admin Client STILL SERVICE_ROLE.");
    }

    // Cleanup
    const { data: userData } = await supabaseAdmin.auth.getUser(); // Note: if polluted this might return the test user!
    console.log("Admin Client current user:", userData?.user?.email || "none");

    const { data: uInfo } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    console.log("Admin Client listUsers:", uInfo?.users?.length > 0 ? "Works" : "Failed");
}

test();
