
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("--- Certificates Table ---");
    const { data: certData, error: certError } = await supabase.from('certificates').select('*').limit(1);
    if (certError) console.error("Certificates Error:", certError.message);
    else console.log("Certificates columns:", certData.length > 0 ? Object.keys(certData[0]) : "No data to infer columns");

    console.log("\n--- Discount Coupons Table ---");
    const { data: couponData, error: couponError } = await supabase.from('discount_coupons').select('code, user_id').limit(5);
    if (couponError) console.error("Coupons Error:", couponError.message);
    else {
        console.log("Coupons sample with user_id mapping:");
        for (const c of couponData) {
            if (c.user_id) {
                const { data: profile } = await supabase.from('profiles').select('email').eq('id', c.user_id).single();
                console.log(`Code: ${c.code} -> Email: ${profile?.email || 'Unknown'}`);
            } else {
                console.log(`Code: ${c.code} -> No user_id assigned`);
            }
        }
    }
}

inspect();
