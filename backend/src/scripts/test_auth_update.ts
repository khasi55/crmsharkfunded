import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const userId = 'e17813c3-3ecf-439c-99b3-99d12b94f0db'; // from previous run

    console.log(`Testing updateUserById for userId: ${userId}`);

    console.log("1. Testing meta update (should succeed)");
    let { error: err1 } = await supabase.auth.admin.updateUserById(userId, { user_metadata: { last_updated: Date.now() } });
    console.log(err1 ? `Fail: ${err1.message}` : "Success");

    console.log("2. Testing password update");
    let { error: err2 } = await supabase.auth.admin.updateUserById(userId, { password: 'Dax@00' });
    console.log(err2 ? `Fail: ${err2.message} (${(err2 as any).code})` : "Success");

    console.log("3. Testing email update");
    let { error: err3 } = await supabase.auth.admin.updateUserById(userId, { email: 'akshitfx18@gmail.com', email_confirm: true });
    console.log(err3 ? `Fail: ${err3.message} (${(err3 as any).code})` : "Success");
}
main();
