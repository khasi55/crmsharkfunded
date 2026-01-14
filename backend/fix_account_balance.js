const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAccount() {
    const login = 889223715;
    console.log(`Fixing account ${login}...`);

    // 1. Update Initial Balance to 5000 and Status to Active
    const { data, error } = await supabase
        .from('challenges')
        .update({
            initial_balance: 5000,
            start_of_day_equity: 5000,
            status: 'active'
        })
        .eq('login', login)
        .select();

    if (error) {
        console.error("Error updating account:", error);
    } else {
        console.log("✅ Account updated successfully:", data);
    }
}

fixAccount();
