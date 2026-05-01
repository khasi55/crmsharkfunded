const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllRows(supabase, table, selectFields, queryModifier) {
    let allData = [];
    let start = 0;
    const limit = 1000;
    while (true) {
        let q = supabase.from(table).select(selectFields).range(start, start + limit - 1);
        if (queryModifier) q = queryModifier(q);
        const { data, error } = await q;
        if (error) {
            console.error(`Error fetching ${table}:`, error);
            break;
        }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < limit) break;
        start += limit;
    }
    return { data: allData };
}

async function run() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const allRevenueDataRes = await fetchAllRows(supabase, 'payment_orders', 'amount, payment_gateway', q => q.eq('status', 'paid'));
    const allPayoutsDataRes = await fetchAllRows(supabase, 'payout_requests', 'amount', q => q.eq('status', 'processed'));
    
    console.log("Revenue fetched:", allRevenueDataRes.data.length);
    console.log("Payouts fetched:", allPayoutsDataRes.data.length);
}
run();
