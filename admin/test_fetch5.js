const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching recent payment orders...");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    let allData = [];
    let start = 0;
    const limit = 1000;
    while (true) {
        let q = supabase.from('payment_orders').select('amount').range(start, start + limit - 1).eq('status', 'paid').gte('created_at', thirtyDaysAgoStr);
        const { data, error } = await q;
        if (error) {
            console.error("Error:", error);
            break;
        }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < limit) break;
        start += limit;
    }
    console.log("Total recent payment orders:", allData.length);
}
run();
