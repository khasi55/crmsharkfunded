const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    async function fetchAllRows(supabase, table, selectFields, queryModifier) {
        let allData = [];
        let start = 0;
        const limit = 1000;
        while (true) {
            let q = supabase.from(table).select(selectFields).range(start, start + limit - 1);
            if (queryModifier) q = queryModifier(q);
            const { data, error } = await q;
            if (!data || data.length === 0) break;
            allData = allData.concat(data);
            if (data.length < limit) break;
            start += limit;
        }
        return { data: allData };
    }

    const [
        { data: monthBreachedData }
    ] = await Promise.all([
        fetchAllRows(supabase, 'challenges', 'updated_at', q => q.in('status', ['breached', 'failed']).gte('updated_at', thirtyDaysAgoStr))
    ]);

    const dateMap = new Map();
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, { breachedAccounts: 0 });
    }

    monthBreachedData?.forEach(c => {
        const breachDate = new Date(c.breached_at || c.updated_at);
        const key = breachDate.toISOString().split('T')[0];
        if (dateMap.has(key)) dateMap.get(key).breachedAccounts += 1;
    });

    const chartData = Array.from(dateMap.values());
    console.log("Are all zero?", chartData.every(d => d.breachedAccounts === 0));
}
run();
