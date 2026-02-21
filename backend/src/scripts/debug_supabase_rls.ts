
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

console.log("--- Supabase Debug Info ---");
console.log("Current Working Directory:", process.cwd());
console.log("__dirname:", __dirname);

const envPath = path.resolve(__dirname, '../../.env');
console.log("Expected .env path:", envPath);

const dotenvResult = dotenv.config({ path: envPath });
console.log("Dotenv load result:", dotenvResult.error ? "FAILED" : "SUCCESS");

console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "SET" : "MISSING");
console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING");
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET (starts with " + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + "...)" : "MISSING");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING");

const finalUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const finalKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Final URL used:", finalUrl);
console.log("Final Key used:", finalKey ? (finalKey === process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE_KEY" : "ANON_KEY") : "NONE");

if (!finalUrl || !finalKey) {
    console.error("❌ CRITICAL: Supabase cannot initialize properly.");
} else {
    const supabase = createClient(finalUrl, finalKey);
    console.log("✅ Supabase client instance created.");

    // Test a simple query to see if RLS triggers
    const queryResult = supabase.from('payment_orders').select('id').limit(1);

    queryResult.then(({ data, error }) => {
        if (error) {
            console.error("❌ Test Query Failed:", error.code, error.message);
        } else {
            console.log("✅ Test Query Succeeded (No RLS violation)");
        }
    });
}
