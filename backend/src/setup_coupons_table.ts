import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDiscountCouponsTable() {
    console.log("Creating discount_coupons table...");

    const { error } = await supabase.rpc('execute_sql', {
        sql_query: `
            CREATE TABLE IF NOT EXISTS discount_coupons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code TEXT NOT NULL UNIQUE,
                description TEXT,
                discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
                discount_value NUMERIC NOT NULL,
                max_discount_amount NUMERIC,
                min_purchase_amount NUMERIC DEFAULT 0,
                max_uses INTEGER,
                max_uses_per_user INTEGER DEFAULT 1,
                account_types TEXT[], -- Array of account types this coupon is valid for
                valid_from TIMESTAMPTZ DEFAULT NOW(),
                valid_until TIMESTAMPTZ,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_coupons_code ON discount_coupons(code);
            CREATE INDEX IF NOT EXISTS idx_coupons_validity ON discount_coupons(valid_from, valid_until);
        `
    });

    if (error) {
        // Fallback if RPC not available (which is common without custom function), 
        // try to see if we can use a knex migration or just manual SQL via some other means?
        // Actually, supabase-js doesn't support generic SQL execution directly on the client 
        // unless you have a stored procedure or use the SQL editor.
        // BUT, since we have the service role key, we might access the PG connection if we had pg-driver, 
        // but we only have supabase-js.

        console.error("Failed to create table via RPC 'execute_sql':", error);
        console.log("Please run the following SQL manually in your Supabase SQL Editor:");
        console.log(`
            CREATE TABLE IF NOT EXISTS discount_coupons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code TEXT NOT NULL UNIQUE,
                description TEXT,
                discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
                discount_value NUMERIC NOT NULL,
                max_discount_amount NUMERIC,
                min_purchase_amount NUMERIC DEFAULT 0,
                max_uses INTEGER,
                max_uses_per_user INTEGER DEFAULT 1,
                account_types TEXT[], 
                valid_from TIMESTAMPTZ DEFAULT NOW(),
                valid_until TIMESTAMPTZ,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    } else {
        console.log("Table created successfully via RPC!");
    }
}

createDiscountCouponsTable();
