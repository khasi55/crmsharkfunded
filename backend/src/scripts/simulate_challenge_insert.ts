
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    // Data from the real order and expected MT5 results
    const orderData = {
        user_id: "04a05ed2-1e1d-45aa-86d2-d0572501e7ed",
        account_type_name: "1 Step Lite",
        account_size: 5000,
        platform: "mt5",
        metadata: {
            "type": "1-step",
            "leverage": 50,
            "mt5_group": "demo\\S\\1-SF",
            "affiliate_id": "bc233390-0e10-41b5-bdb6-2af66edd6af8",
            "commission_rate": 10
        }
    };

    const mt5Data = {
        login: 123456789, // Dummy login for testing
        password: "TestPassword123",
        investor_password: "InvestorPassword123",
        server: "ALFX Limited"
    };

    const mt5Group = "demo\\S\\1-SF";
    const leverage = 100;

    console.log('Attempting manual insert into challenges...');

    const { data, error } = await supabase
        .from('challenges')
        .insert({
            user_id: orderData.user_id,
            challenge_type: orderData.account_type_name,
            initial_balance: orderData.account_size,
            current_balance: orderData.account_size,
            current_equity: orderData.account_size,
            start_of_day_equity: orderData.account_size,
            status: 'active',
            login: mt5Data.login,
            master_password: mt5Data.password,
            investor_password: mt5Data.investor_password,
            server: mt5Data.server,
            platform: orderData.platform,
            leverage: leverage,
            group: mt5Group,
            metadata: orderData.metadata,
        })
        .select();

    if (error) {
        console.error('❌ Insert FAILED:', error);
    } else {
        console.log('✅ Insert SUCCESSFUL:', data);
    }
}

check();
